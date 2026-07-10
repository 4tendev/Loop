import { getRedisClient } from "./database.mjs";

function parseCookies(cookieHeader = "") {
  const cookies = new Map();

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (key) {
      cookies.set(key, decodeURIComponent(value));
    }
  }

  return cookies;
}

function isApiUser(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.type === "member" || value.type === "admin") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export async function getUserFromRequest(request) {
  const ssid = parseCookies(request.headers.cookie).get("SSID");

  if (!ssid) {
    return null;
  }

  const redis = await getRedisClient();
  const savedUser = await redis.get(`user:ssid:${ssid}`);

  if (!savedUser) {
    return null;
  }

  try {
    const user = JSON.parse(savedUser);

    return isApiUser(user) ? user : null;
  } catch {
    return null;
  }
}
