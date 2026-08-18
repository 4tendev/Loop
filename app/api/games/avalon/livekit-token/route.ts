import { AccessToken, TrackSource } from "livekit-server-sdk";
import { NextRequest } from "next/server";

import {
  apiResponse,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import { avalonVoiceRoomExists } from "@/server/avalon/livekit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LiveKitTokenRequest = { gameId?: unknown };

export async function POST(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);
  if (!session) return unauthorized("ابتدا وارد حساب خود شوید");

  let body: LiveKitTokenRequest;
  try {
    body = (await request.json()) as LiveKitTokenRequest;
  } catch {
    return badRequest("درخواست نامعتبر است");
  }

  if (typeof body.gameId !== "string" || !body.gameId) {
    return badRequest("شناسه بازی الزامی است");
  }

  try {
    const accessResult = await getPostgresPool().query(
      `
        SELECT game.status
        FROM avalon_games AS game
        INNER JOIN avalon_seats AS seat ON seat.game_id = game.id
        WHERE
          game.id = $1
          AND game.use_voice_chat = true
          AND game.status IN ('lobby', 'inProgress', 'completed')
          AND seat.player_id = $2
        LIMIT 1
      `,
      [body.gameId, session.user.id],
    );

    if (accessResult.rowCount !== 1) {
      return unauthorized("فقط بازیکنان این بازی به گفت‌وگوی صوتی دسترسی دارند");
    }

    if (
      accessResult.rows[0].status === "completed" &&
      !(await avalonVoiceRoomExists(body.gameId))
    ) {
      return apiResponse(410, "اتاق گفت‌وگوی صوتی این بازی بسته شده است", null, {
        status: 410,
      });
    }

    const serverUrl = process.env.LIVEKIT_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    if (!serverUrl || !apiKey || !apiSecret) {
      throw new Error("LiveKit configuration is missing");
    }

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: session.user.id,
      name: session.user.name,
      ttl: "6h",
    });
    accessToken.addGrant({
      room: `avalon-${body.gameId}`,
      roomJoin: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
      canUpdateOwnMetadata: false,
    });

    return apiResponse(200, "دسترسی موقت گفت‌وگوی صوتی", {
      serverUrl,
      participantToken: await accessToken.toJwt(),
    });
  } catch (error) {
    console.error("Failed to create Avalon LiveKit token", error);
    return serverError("آماده‌سازی گفت‌وگوی صوتی انجام نشد");
  }
}
