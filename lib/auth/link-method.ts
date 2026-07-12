import type { Pool, PoolClient } from "pg";
import type { AuthProvider } from "@/types/user";

export class AuthMethodAlreadyLinkedError extends Error {}

export async function linkAuthMethod(database: Pool | PoolClient, userId: string, provider: AuthProvider, providerUserId: string) {
  const existing = await database.query<{ userId: string }>(
    `SELECT user_id AS "userId" FROM user_auth_methods WHERE provider = $1 AND provider_user_id = $2`, [provider, providerUserId]);
  if (existing.rows[0] && existing.rows[0].userId !== userId) throw new AuthMethodAlreadyLinkedError();
  await database.query(
    `INSERT INTO user_auth_methods (user_id, provider, provider_user_id, last_used_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET last_used_at = now()`, [userId, provider, providerUserId]);
}
