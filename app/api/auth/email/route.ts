import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/email";
import {
  getOrCreateEmailLoginCode,
  verifySavedEmailLoginCode,
} from "@/lib/auth/email/login-code";
import { getRedisClient } from "@/lib/redis";
import type { ApiUser, User } from "@/types/user";

export const dynamic = "force-dynamic";

const sessionCookieName = "SSID";
const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

type EmailLoginRequestBody = {
  email?: unknown;
  code?: unknown;
};

function getSessionKey(ssid: string) {
  return `user:ssid:${ssid}`;
}

function toApiUser(user: User): ApiUser {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      code: 400,
      message,
      data: null,
    },
    { status: 400 },
  );
}

function unauthorized(message: string) {
  return NextResponse.json(
    {
      code: 401,
      message,
      data: null,
    },
    { status: 401 },
  );
}

async function createUserSession(user: User) {
  const ssid = randomUUID();
  const apiUser = toApiUser(user);
  const redis = await getRedisClient();

  await redis.set(getSessionKey(ssid), JSON.stringify(apiUser));

  return {
    ssid,
    user: apiUser,
  };
}

export async function POST(request: NextRequest) {
  let body: EmailLoginRequestBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return badRequest("Email is required");
  }

  if (body.code !== undefined) {
    if (typeof body.code !== "string" || !body.code.trim()) {
      return badRequest("Code is required");
    }

    try {
      const verified = await verifySavedEmailLoginCode(body.email, body.code);

      if (!verified) {
        return unauthorized("Invalid or expired email login code");
      }

      const user = await getOrCreateUser(body.email);
      const session = await createUserSession(user);
      const response = NextResponse.json({
        code: 200,
        message: "email login verified",
        data: session.user,
      });

      response.cookies.set(sessionCookieName, session.ssid, {
        httpOnly: true,
        maxAge: sessionCookieMaxAgeSeconds,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid email address") {
        return badRequest(error.message);
      }

      console.error("Failed to verify email login code", error);

      return NextResponse.json(
        {
          code: 500,
          message: "Failed to verify email login code",
          data: null,
        },
        { status: 500 },
      );
    }
  }

  try {
    const data = await getOrCreateEmailLoginCode(body.email);

    return NextResponse.json({
      code: 200,
      message: "email login code sent",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid email address") {
      return badRequest(error.message);
    }

    console.error("Failed to send email login code", error);

    return NextResponse.json(
      {
        code: 500,
        message: "Failed to send email login code",
        data: null,
      },
      { status: 500 },
    );
  }
}
