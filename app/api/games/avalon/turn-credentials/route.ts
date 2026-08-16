import { NextRequest } from "next/server";

import {
  apiResponse,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import { getRedisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const credentialLifetimeSeconds = 6 * 60 * 60;
const cacheLifetimeSeconds = credentialLifetimeSeconds - 60;

type TurnCredentialRequest = {
  gameId?: unknown;
};

type MeteredCredential = {
  apiKey?: unknown;
};

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

function getMeteredDomain() {
  return process.env.METERED_DOMAIN?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function isIceServer(value: unknown): value is IceServer {
  if (!value || typeof value !== "object") return false;
  const server = value as Record<string, unknown>;
  const hasValidUrls =
    typeof server.urls === "string" ||
    (Array.isArray(server.urls) &&
      server.urls.length > 0 &&
      server.urls.every((url) => typeof url === "string"));

  return (
    hasValidUrls &&
    (server.username === undefined || typeof server.username === "string") &&
    (server.credential === undefined || typeof server.credential === "string")
  );
}

export async function POST(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);
  if (!session) return unauthorized("ابتدا وارد حساب خود شوید");

  let body: TurnCredentialRequest;
  try {
    body = (await request.json()) as TurnCredentialRequest;
  } catch {
    return badRequest("درخواست نامعتبر است");
  }

  if (typeof body.gameId !== "string" || !body.gameId) {
    return badRequest("شناسه بازی الزامی است");
  }

  try {
    const accessResult = await getPostgresPool().query(
      `
        SELECT 1
        FROM avalon_games AS game
        INNER JOIN avalon_seats AS seat
          ON seat.game_id = game.id
        WHERE
          game.id = $1
          AND game.status = 'inProgress'
          AND seat.player_id = $2
        LIMIT 1
      `,
      [body.gameId, session.user.id],
    );

    if (accessResult.rowCount !== 1) {
      return unauthorized("فقط بازیکنان این بازی به گفت‌وگوی صوتی دسترسی دارند");
    }

    const redis = await getRedisClient();
    const cacheKey = `avalon:turn-ice:${body.gameId}`;
    const cachedIceServers = await redis.get(cacheKey);
    if (cachedIceServers) {
      return apiResponse(
        200,
        "تنظیمات موقت گفت‌وگوی صوتی",
        JSON.parse(cachedIceServers) as IceServer[],
      );
    }

    const meteredDomain = getMeteredDomain();
    const meteredSecretKey = process.env.METERED_SECRET_KEY?.trim();
    if (!meteredDomain || !meteredSecretKey) {
      throw new Error("Metered TURN configuration is missing");
    }

    const createCredentialResponse = await fetch(
      `https://${meteredDomain}/api/v1/turn/credential?secretKey=${encodeURIComponent(meteredSecretKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiryInSeconds: credentialLifetimeSeconds,
          label: `avalon-${body.gameId}`,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!createCredentialResponse.ok) {
      throw new Error(
        `Metered credential creation failed (${createCredentialResponse.status})`,
      );
    }

    const credential =
      (await createCredentialResponse.json()) as MeteredCredential;
    if (typeof credential.apiKey !== "string" || !credential.apiKey) {
      throw new Error("Metered did not return a credential API key");
    }

    const iceResponse = await fetch(
      `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(credential.apiKey)}&region=global`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );

    if (!iceResponse.ok) {
      throw new Error(`Metered ICE lookup failed (${iceResponse.status})`);
    }

    const iceServers = (await iceResponse.json()) as unknown;
    if (
      !Array.isArray(iceServers) ||
      iceServers.length === 0 ||
      !iceServers.every(isIceServer)
    ) {
      throw new Error("Metered returned an invalid ICE server list");
    }

    await redis.setEx(cacheKey, cacheLifetimeSeconds, JSON.stringify(iceServers));

    return apiResponse(200, "تنظیمات موقت گفت‌وگوی صوتی", iceServers);
  } catch (error) {
    console.error("Failed to prepare Avalon TURN credentials", error);
    return serverError("آماده‌سازی اتصال پشتیبان صوتی انجام نشد");
  }
}
