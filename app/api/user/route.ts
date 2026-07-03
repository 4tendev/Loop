import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import type { User } from "@/types/user";

export const dynamic = "force-dynamic";

const sessionCookieName = "SSID";

type ApiUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

function getSessionKey(ssid: string) {
  return `user:ssid:${ssid}`;
}

function isApiUser(value: unknown): value is ApiUser {
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

function unknownUser() {
  return NextResponse.json(
    {
      code: 401,
      message: "unknown user",
      data: null,
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const ssid = request.cookies.get(sessionCookieName)?.value;

  if (!ssid) {
    return unknownUser();
  }

  const redis = await getRedisClient();
  const savedUser = await redis.get(getSessionKey(ssid));

  if (!savedUser) {
    return unknownUser();
  }

  try {
    const user = JSON.parse(savedUser);

    if (!isApiUser(user)) {
      return unknownUser();
    }

    return NextResponse.json({
      code: 200,
      message: "user found",
      data: user,
    });
  } catch {
    return unknownUser();
  }
}
