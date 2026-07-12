import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api-response";
import {
  getTelegramAuthOrigin,
  getOrCreateTelegramUser,
  type TelegramLoginPayload,
  verifyTelegramLoginPayload,
} from "@/lib/auth/telegram";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { AuthMethodAlreadyLinkedError, linkAuthMethod } from "@/lib/auth/link-method";
import { createTelegramProviderUserId, telegramAuthProvider } from "@/lib/auth/telegram";
import { getPostgresPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

const telegramLoginFields = [
  "id",
  "first_name",
  "last_name",
  "username",
  "photo_url",
  "auth_date",
  "hash",
] as const;

function getPayloadFromRequest(request: NextRequest) {
  const payload: Partial<TelegramLoginPayload> = {};

  for (const field of telegramLoginFields) {
    const value = request.nextUrl.searchParams.get(field);

    if (value !== null) {
      payload[field] = value;
    }
  }

  if (!payload.id || !payload.auth_date || !payload.hash) {
    return null;
  }

  return payload as TelegramLoginPayload;
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);

    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getForwardedOrigin(request: NextRequest) {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!forwardedHost) {
    return "";
  }

  const host = forwardedHost.split(",")[0]?.trim();

  if (!host) {
    return "";
  }

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto ||
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

  return `${protocol}://${host}`;
}

function getRedirectUrl(request: NextRequest, path: string) {
  const configuredOrigin = getTelegramAuthOrigin();
  const forwardedOrigin = getForwardedOrigin(request);
  const origin =
    configuredOrigin && !isLocalOrigin(configuredOrigin)
      ? configuredOrigin
      : forwardedOrigin || configuredOrigin || request.nextUrl.origin;

  return new URL(path, origin);
}

function redirectWithError(request: NextRequest, message: string) {
  const url = getRedirectUrl(request, "/auth");
  url.searchParams.set("telegramError", message);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const payload = getPayloadFromRequest(request);

  if (!payload) {
    return badRequest("داده‌های ورود تلگرام نامعتبر است");
  }

  try {
    const verified = verifyTelegramLoginPayload(payload);

    if (!verified) {
      return redirectWithError(
        request,
        "ورود با تلگرام نامعتبر است یا منقضی شده",
      );
    }

    if (request.nextUrl.searchParams.get("link") === "1") {
      const currentSession = await getUserSessionFromRequest(request);
      if (!currentSession) return redirectWithError(request, "ابتدا وارد حساب خود شوید");
      await linkAuthMethod(getPostgresPool(), currentSession.user.id, telegramAuthProvider, createTelegramProviderUserId(payload.id));
      return NextResponse.redirect(getRedirectUrl(request, "/user?linked=telegram"));
    }

    const user = await getOrCreateTelegramUser(payload);
    const session = await createUserSession(user);
    const response = NextResponse.redirect(getRedirectUrl(request, "/user"));

    setSessionCookie(response, session);

    return response;
  } catch (error) {
    if (error instanceof AuthMethodAlreadyLinkedError) {
      return redirectWithError(request, "این حساب تلگرام به کاربر دیگری متصل است");
    }
    if (
      error instanceof Error &&
      (error.message === "Invalid Telegram user id" ||
        error.message === "TELEGRAM_BOT_TOKEN is not set")
    ) {
      return redirectWithError(request, "ورود با تلگرام پیکربندی نشده است");
    }

    console.error("Failed to authenticate with Telegram", error);

    return redirectWithError(request, "ورود با تلگرام انجام نشد");
  }
}
