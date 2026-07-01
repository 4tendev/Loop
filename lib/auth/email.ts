import { randomInt, timingSafeEqual } from "node:crypto";
import { getRedisClient } from "@/lib/redis";
import type { AuthProvider, CreateUserAuthMethodInput, User } from "@/types/user";

export const emailAuthProvider = "email" satisfies AuthProvider;

export const emailCodeLength = 6;
export const emailCodeTtlMs = 10 * 60 * 1000;

export type EmailLoginCode = {
  provider: typeof emailAuthProvider;
  providerUserId: string;
  code: string;
  expiresAt: Date;
};

type StoredEmailLoginCode = Omit<EmailLoginCode, "expiresAt"> & {
  expiresAt: string;
};

export function normalizeEmailProviderUserId(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailProviderUserId(providerUserId: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerUserId);
}

export function createEmailProviderUserId(email: string) {
  const providerUserId = normalizeEmailProviderUserId(email);

  if (!isValidEmailProviderUserId(providerUserId)) {
    throw new Error("Invalid email address");
  }

  return providerUserId;
}

export function createEmailAuthMethodInput(
  userId: User["id"],
  email: string,
): CreateUserAuthMethodInput {
  return {
    userId,
    provider: emailAuthProvider,
    providerUserId: createEmailProviderUserId(email),
  };
}

export function createEmailLoginCode(
  email: string,
  now = new Date(),
): EmailLoginCode {
  return {
    provider: emailAuthProvider,
    providerUserId: createEmailProviderUserId(email),
    code: randomInt(0, 10 ** emailCodeLength)
      .toString()
      .padStart(emailCodeLength, "0"),
    expiresAt: new Date(now.getTime() + emailCodeTtlMs),
  };
}

export function getEmailLoginCodeKey(email: string) {
  return `auth:email-code:${createEmailProviderUserId(email)}`;
}

export async function saveEmailLoginCode(loginCode: EmailLoginCode) {
  const redis = await getRedisClient();
  const ttlSeconds = Math.ceil(
    (loginCode.expiresAt.getTime() - Date.now()) / 1000,
  );

  if (ttlSeconds <= 0) {
    throw new Error("Email login code is already expired");
  }

  const storedLoginCode: StoredEmailLoginCode = {
    ...loginCode,
    expiresAt: loginCode.expiresAt.toISOString(),
  };

  await redis.setEx(
    getEmailLoginCodeKey(loginCode.providerUserId),
    ttlSeconds,
    JSON.stringify(storedLoginCode),
  );
}

export async function getSavedEmailLoginCode(email: string) {
  const redis = await getRedisClient();
  const value = await redis.get(getEmailLoginCodeKey(email));

  if (!value) {
    return null;
  }

  const storedLoginCode = JSON.parse(value) as StoredEmailLoginCode;

  return {
    ...storedLoginCode,
    expiresAt: new Date(storedLoginCode.expiresAt),
  } satisfies EmailLoginCode;
}

export async function deleteSavedEmailLoginCode(email: string) {
  const redis = await getRedisClient();
  await redis.del(getEmailLoginCodeKey(email));
}

export function isEmailLoginCodeExpired(
  loginCode: Pick<EmailLoginCode, "expiresAt">,
  now = new Date(),
) {
  return loginCode.expiresAt.getTime() <= now.getTime();
}

export function verifyEmailLoginCode(
  loginCode: Pick<EmailLoginCode, "code" | "expiresAt">,
  code: string,
  now = new Date(),
) {
  if (isEmailLoginCodeExpired(loginCode, now)) {
    return false;
  }

  const expected = Buffer.from(loginCode.code);
  const received = Buffer.from(code.trim());

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function verifySavedEmailLoginCode(email: string, code: string) {
  const loginCode = await getSavedEmailLoginCode(email);

  if (!loginCode || !verifyEmailLoginCode(loginCode, code)) {
    return false;
  }

  await deleteSavedEmailLoginCode(email);
  return true;
}
