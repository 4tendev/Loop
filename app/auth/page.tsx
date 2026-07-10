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

export default async function Auth() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const ssid = cookieStore.get(sessionCookieName)?.value;
  const session = ssid ? await getUserSessionBySsid(ssid) : null;

  if (session) {
    redirect("/user");
  }

  return (
    <AuthClient
      telegramAuthOrigin={getPublicTelegramAuthOrigin(headerStore)}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
