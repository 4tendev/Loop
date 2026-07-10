import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getUserSessionBySsid,
  sessionCookieName,
} from "@/lib/auth/session";
import {
  getTelegramAuthOrigin,
  getTelegramBotUsername,
} from "@/lib/auth/telegram";
import AuthClient from "./AuthClient";

export default async function Auth() {
  const cookieStore = await cookies();
  const ssid = cookieStore.get(sessionCookieName)?.value;
  const session = ssid ? await getUserSessionBySsid(ssid) : null;

  if (session) {
    redirect("/user");
  }

  return (
    <AuthClient
      telegramAuthOrigin={getTelegramAuthOrigin()}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
