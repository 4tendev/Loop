import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { emailAuthProvider, createEmailProviderUserId } from "@/lib/auth/email";
import { getRedisClient } from "@/lib/redis";
import { sendEmail } from "./send-email";

export const emailCodeLength = 5;
export const emailCodeTtlMs = 5 * 60 * 1000;

export type EmailLoginCode = {
  provider: typeof emailAuthProvider;
  providerUserId: string;
  code: string;
};

export type SavedEmailLoginCode = {
  codeHash: string;
  timeLeftMs: number;
};

export type EmailLoginCodeTimeLeft = {
  timeLeftMs: number;
};

export async function createEmailLoginCode(
  email: string,
): Promise<EmailLoginCode> {
  const loginCode: EmailLoginCode = {
    provider: emailAuthProvider,
    providerUserId: createEmailProviderUserId(email),
    code: randomInt(0, 10 ** emailCodeLength)
      .toString()
      .padStart(emailCodeLength, "0"),
  };

  await sendEmail({
    to: loginCode.providerUserId,
    subject: "Your authentication code",
    text: `Your authentication code is ${loginCode.code}. It expires in 5 minutes.`,
  });

  return loginCode;
}

export function hashEmailLoginCode(code: string) {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function getEmailLoginCodeKey(email: string) {
  return `auth:email-code:${createEmailProviderUserId(email)}`;
}

export async function saveEmailLoginCode(loginCode: EmailLoginCode) {
  const redis = await getRedisClient();
  const ttlSeconds = Math.ceil(emailCodeTtlMs / 1000);

  await redis.setEx(
    getEmailLoginCodeKey(loginCode.providerUserId),
    ttlSeconds,
    hashEmailLoginCode(loginCode.code),
  );
}

export async function getSavedEmailLoginCode(
  email: string,
): Promise<SavedEmailLoginCode | null> {
  const redis = await getRedisClient();
  const key = getEmailLoginCodeKey(email);
  const [codeHash, ttlSeconds] = await Promise.all([
    redis.get(key),
    redis.ttl(key),
  ]);

  if (!codeHash) {
    return null;
  }

  return {
    codeHash,
    timeLeftMs: Math.max(ttlSeconds, 0) * 1000,
  };
}

export async function getSavedEmailLoginCodeTimeLeft(email: string) {
  const redis = await getRedisClient();
  const ttlSeconds = await redis.ttl(getEmailLoginCodeKey(email));

  return Math.max(ttlSeconds, 0) * 1000;
}

export async function getOrCreateEmailLoginCode(
  email: string,
): Promise<EmailLoginCodeTimeLeft> {
  const timeLeftMs = await getSavedEmailLoginCodeTimeLeft(email);

  if (timeLeftMs > 0) {
    return { timeLeftMs };
  }

  const loginCode = await createEmailLoginCode(email);
  await saveEmailLoginCode(loginCode);

  return {
    timeLeftMs: emailCodeTtlMs,
  };
}

export async function deleteSavedEmailLoginCode(email: string) {
  const redis = await getRedisClient();
  await redis.del(getEmailLoginCodeKey(email));
}

export function verifyEmailLoginCode(
  loginCode: Pick<SavedEmailLoginCode, "codeHash" | "timeLeftMs">,
  code: string,
) {
  if (loginCode.timeLeftMs <= 0) {
    return false;
  }

  const expected = Buffer.from(loginCode.codeHash);
  const received = Buffer.from(hashEmailLoginCode(code));

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function verifySavedEmailLoginCode(email: string, code: string) {
  const loginCode = await getSavedEmailLoginCode(email);
  if (!loginCode) {
    return null;
  }
  if (!verifyEmailLoginCode(loginCode, code)) {
    return false;
  }

  await deleteSavedEmailLoginCode(email);
  return true;
}
