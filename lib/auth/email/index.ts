import type { AuthProvider, CreateUserAuthMethodInput, User } from "@/types/user";
import { getPostgresPool } from "@/lib/postgres";
import type { Pool, PoolClient } from "pg";

export const emailAuthProvider = "email" satisfies AuthProvider;

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

export function getOrCreateEmailAuthMethodInput(
  email: string,
): CreateUserAuthMethodInput {
  return {
    provider: emailAuthProvider,
    providerUserId: createEmailProviderUserId(email),
  };
}

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

async function getUserByEmailProviderUserId(
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
    [emailAuthProvider, providerUserId],
  );

  return result.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const providerUserId = createEmailProviderUserId(email);
  const pool = getPostgresPool();

  return getUserByEmailProviderUserId(pool, providerUserId);
}

export async function getOrCreateUser(email: string): Promise<User> {
  const providerUserId = createEmailProviderUserId(email);
  const pool = getPostgresPool();
  const existingUser = await getUserByEmailProviderUserId(pool, providerUserId);

  if (existingUser) {
    return existingUser;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUserInTransaction = await getUserByEmailProviderUserId(
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
      [providerUserId, "/avatar.png"],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_auth_methods (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)
      `,
      [user.id, emailAuthProvider, providerUserId],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (isUniqueViolation(error)) {
      const existingUserAfterConflict = await getUserByEmailProviderUserId(
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
