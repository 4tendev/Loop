import { cookies } from "next/headers";
import { headers } from "next/headers";
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

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);

    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getForwardedOrigin(headerStore: Headers) {
  const forwardedHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!forwardedHost) {
    return "";
  }

  const host = forwardedHost.split(",")[0]?.trim();

  if (!host) {
    return "";
  }

  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto ||
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

  return `${protocol}://${host}`;
}

function getPublicAuthOrigin(headerStore: Headers) {
  const configuredOrigin = getTelegramAuthOrigin();

  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
    return configuredOrigin;
  }

  return getForwardedOrigin(headerStore) || configuredOrigin;
}

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
      telegramAuthOrigin={getPublicAuthOrigin(headerStore)}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
