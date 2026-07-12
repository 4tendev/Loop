import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getUserSessionBySsid,
  sessionCookieName,
} from "@/lib/auth/session";
import { getTelegramBotUsername } from "@/lib/auth/telegram";
import { getPostgresPool } from "@/lib/postgres";
import type { AuthProvider } from "@/types/user";
import AuthClient from "./AuthClient";
import { getPublicTelegramAuthOrigin } from "./telegram/auth-origin";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Auth({ searchParams }: AuthPageProps) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const params = await searchParams;
  const isLinking = params.link === "1";
  const ssid = cookieStore.get(sessionCookieName)?.value;
  const session = ssid ? await getUserSessionBySsid(ssid) : null;

  if (session && !isLinking) {
    redirect("/user");
  }

  if (isLinking && !session) {
    redirect("/auth");
  }

  const authenticatedMethods =
    isLinking && session
      ? (
          await getPostgresPool().query<{ provider: AuthProvider }>(
            `SELECT DISTINCT provider
             FROM user_auth_methods
             WHERE user_id = $1`,
            [session.user.id],
          )
        ).rows
          .map(({ provider }) => provider)
          .filter(
            (provider): provider is "email" | "telegram" | "device" =>
              provider === "email" ||
              provider === "telegram" ||
              provider === "device",
          )
      : [];

  return (
    <AuthClient
      authenticatedMethods={authenticatedMethods}
      telegramAuthOrigin={getPublicTelegramAuthOrigin(headerStore)}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
