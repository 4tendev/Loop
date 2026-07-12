import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getUserSessionBySsid,
  sessionCookieName,
} from "@/lib/auth/session";
import { getTelegramBotUsername } from "@/lib/auth/telegram";
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

  return (
    <AuthClient
      telegramAuthOrigin={getPublicTelegramAuthOrigin(headerStore)}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
