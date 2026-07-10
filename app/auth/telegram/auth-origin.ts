import { getTelegramAuthOrigin } from "@/lib/auth/telegram";

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

export function getPublicTelegramAuthOrigin(headerStore: Headers) {
  const configuredOrigin = getTelegramAuthOrigin();

  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
    return configuredOrigin;
  }

  return getForwardedOrigin(headerStore) || configuredOrigin;
}
