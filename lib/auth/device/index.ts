import type { Pool, PoolClient } from "pg";
import { getPostgresPool } from "@/lib/postgres";
import type { AuthProvider, User } from "@/types/user";

export const deviceAuthProvider = "device" satisfies AuthProvider;

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

export function isValidDeviceProviderUserId(providerUserId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    providerUserId.trim(),
  );
}

export function createDeviceProviderUserId(deviceId: string) {
  const providerUserId = deviceId.trim().toLowerCase();

  if (!isValidDeviceProviderUserId(providerUserId)) {
    throw new Error("Invalid device id");
  }

  return providerUserId;
}

async function getUserByDeviceProviderUserId(
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
    [deviceAuthProvider, providerUserId],
  );

  return result.rows[0] ?? null;
}

export async function getOrCreateDeviceUser(
  deviceId: string,
  name?: string,
): Promise<User> {
  const providerUserId = createDeviceProviderUserId(deviceId);
  const pool = getPostgresPool();
  const existingUser = await getUserByDeviceProviderUserId(pool, providerUserId);

  if (existingUser) {
    return existingUser;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUserInTransaction = await getUserByDeviceProviderUserId(
      client,
      providerUserId,
    );

    if (existingUserInTransaction) {
      await client.query("COMMIT");
      return existingUserInTransaction;
    }

    const trimmedName = name?.trim() ?? "";

    if (!trimmedName || trimmedName.length > 80) {
      throw new Error("Invalid device user name");
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
      [trimmedName, "/avatar.png"],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_auth_methods (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)
      `,
      [user.id, deviceAuthProvider, providerUserId],
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (isUniqueViolation(error)) {
      const existingUserAfterConflict = await getUserByDeviceProviderUserId(
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
