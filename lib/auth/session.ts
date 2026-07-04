import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import type { ApiUser, User } from "@/types/user";

export const sessionCookieName = "SSID";
export const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export type UserSession = {
  ssid: string;
  user: ApiUser;
};

export function getSessionKey(ssid: string) {
  return `user:ssid:${ssid}`;
}

export function toApiUser(user: User): ApiUser {
  return {
    ...user,
    profileImage: user.profileImage || "/avatar.png",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function isApiUser(value: unknown): value is ApiUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<Record<keyof ApiUser, unknown>>;

  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    (user.type === "member" || user.type === "admin") &&
    typeof user.createdAt === "string" &&
    typeof user.updatedAt === "string"
  );
}

export async function createUserSession(user: User): Promise<UserSession> {
  const ssid = randomUUID();
  const apiUser = toApiUser(user);
  const redis = await getRedisClient();

  await redis.setEx(
    getSessionKey(ssid),
    sessionCookieMaxAgeSeconds,
    JSON.stringify(apiUser),
  );

  return {
    ssid,
    user: apiUser,
  };
}

export async function updateUserSession(
  session: Pick<UserSession, "ssid">,
  user: User,
): Promise<UserSession> {
  const apiUser = toApiUser(user);
  const redis = await getRedisClient();

  await redis.setEx(
    getSessionKey(session.ssid),
    sessionCookieMaxAgeSeconds,
    JSON.stringify(apiUser),
  );

  return {
    ssid: session.ssid,
    user: apiUser,
  };
}

export async function getUserSessionBySsid(
  ssid: string,
): Promise<UserSession | null> {
  const redis = await getRedisClient();
  const savedUser = await redis.get(getSessionKey(ssid));

  if (!savedUser) {
    return null;
  }

  try {
    const user = JSON.parse(savedUser);

    if (!isApiUser(user)) {
      return null;
    }

    return {
      ssid,
      user,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  session: Pick<UserSession, "ssid">,
) {
  response.cookies.set(sessionCookieName, session.ssid, {
    httpOnly: true,
    maxAge: sessionCookieMaxAgeSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getUserSessionFromRequest(
  request: NextRequest,
): Promise<UserSession | null> {
  const ssid = request.cookies.get(sessionCookieName)?.value;

  if (!ssid) {
    return null;
  }

  return getUserSessionBySsid(ssid);
}
