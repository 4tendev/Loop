import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api-response";
import {
  getOrCreateTelegramUser,
  type TelegramLoginPayload,
  verifyTelegramLoginPayload,
} from "@/lib/auth/telegram";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";

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

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/auth", request.url);
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

    const user = await getOrCreateTelegramUser(payload);
    const session = await createUserSession(user);
    const response = NextResponse.redirect(new URL("/user", request.url));

    setSessionCookie(response, session);

    return response;
  } catch (error) {
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
