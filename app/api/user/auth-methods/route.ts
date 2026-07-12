import { NextRequest } from "next/server";
import { apiResponse, serverError, unauthorized } from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import type { AuthProvider } from "@/types/user";

export const dynamic = "force-dynamic";

type ApiAuthMethod = { id: string; provider: AuthProvider; providerUserId: string; createdAt: string; lastUsedAt: string | null };

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);
  if (!session) return unauthorized("ابتدا وارد حساب خود شوید");
  try {
    const result = await getPostgresPool().query<ApiAuthMethod>(
      `SELECT id, provider, provider_user_id AS "providerUserId", created_at AS "createdAt", last_used_at AS "lastUsedAt"
       FROM user_auth_methods WHERE user_id = $1 ORDER BY created_at`, [session.user.id]);
    return apiResponse(200, "روش‌های ورود دریافت شدند", result.rows);
  } catch (error) {
    console.error("Failed to get auth methods", error);
    return serverError("دریافت روش‌های ورود انجام نشد");
  }
}
