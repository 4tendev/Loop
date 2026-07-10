import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getPostgresPool } from "@/lib/postgres";
import type { AuthProvider, User } from "@/types/user";

export const telegramAuthProvider = "telegram" satisfies AuthProvider;
export const telegramLoginMaxAgeSeconds = 60 * 60 * 24;

export type TelegramLoginPayload = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

type UserRow = {
  id: string;
  profileImage: string;
  name: string;
  type: User["type"];
  createdAt: Date;
  updatedAt: Date;
};

type UserQueryClient = Pick<Pool | PoolClient, "query">;

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function getTelegramBotUsername() {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ??
    ""
  );
}

function normalizeTelegramAuthOrigin(origin: string) {
  const trimmed = origin.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return "";
  }

  const protocol =
    /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed) ? "http" : "https";
  const urlCandidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${protocol}://${trimmed}`;

  try {
    return new URL(urlCandidate).origin;
  } catch {
    return "";
  }
}

export function getTelegramAuthOrigin() {
  return normalizeTelegramAuthOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "");
}

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function normalizeTelegramProviderUserId(id: string) {
  return id.trim();
}

export function isValidTelegramProviderUserId(providerUserId: string) {
  return /^\d+$/.test(providerUserId);
}

function createTelegramProviderUserId(id: string) {
  const providerUserId = normalizeTelegramProviderUserId(id);

  if (!isValidTelegramProviderUserId(providerUserId)) {
    throw new Error("Invalid Telegram user id");
  }

  return providerUserId;
}

function getTelegramDisplayName(payload: TelegramLoginPayload) {
  const fullName = [payload.first_name, payload.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return fullName;
  }

  if (payload.username?.trim()) {
    return `@${payload.username.trim()}`;
  }

  return `Telegram ${payload.id}`;
}

function getTelegramProfileImage(payload: TelegramLoginPayload) {
  return payload.photo_url?.trim() || "/avatar.png";
}

function getDataCheckString(payload: TelegramLoginPayload) {
  return Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function verifyTelegramLoginPayload(payload: TelegramLoginPayload) {
  const botToken = getTelegramBotToken();

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const authDateSeconds = Number(payload.auth_date);

  if (!Number.isFinite(authDateSeconds)) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSeconds;

  if (ageSeconds < 0 || ageSeconds > telegramLoginMaxAgeSeconds) {
    return false;
  }

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(getDataCheckString(payload))
    .digest("hex");

  const actual = Buffer.from(payload.hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function getUserByTelegramProviderUserId(
  client: UserQueryClient,
  providerUserId: string,
) {
  const result = await client.query<UserRow>(
    `
      SELECT
        users.id,
        users.profile_image AS "profileImage",
        users.name,
        users.type,
        users.created_at AS "createdAt",
        users.updated_at AS "updatedAt"
      FROM user_auth_methods
      INNER JOIN users ON users.id = user_auth_methods.user_id
      WHERE user_auth_methods.provider = $1
        AND user_auth_methods.provider_user_id = $2
      LIMIT 1
    `,
    [telegramAuthProvider, providerUserId],
  );

  return result.rows[0] ?? null;
}

export async function getOrCreateTelegramUser(
  payload: TelegramLoginPayload,
): Promise<User> {
  const providerUserId = createTelegramProviderUserId(payload.id);
  const pool = getPostgresPool();
  const existingUser = await getUserByTelegramProviderUserId(
    pool,
    providerUserId,
  );

  if (existingUser) {
    return existingUser;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUserInTransaction = await getUserByTelegramProviderUserId(
      client,
      providerUserId,
    );

    if (existingUserInTransaction) {
      await client.query("COMMIT");
      return existingUserInTransaction;
    }

    const userResult = await client.query<UserRow>(
      `
        INSERT INTO users (name, profile_image)
        VALUES ($1, $2)
        RETURNING
          id,
          profile_image AS "profileImage",
          name,
          type,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [getTelegramDisplayName(payload), getTelegramProfileImage(payload)],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_auth_methods (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)
      `,
      [user.id, telegramAuthProvider, providerUserId],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (isUniqueViolation(error)) {
      const existingUserAfterConflict = await getUserByTelegramProviderUserId(
        pool,
        providerUserId,
      );

      if (existingUserAfterConflict) {
        return existingUserAfterConflict;
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
