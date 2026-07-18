import { NextRequest } from "next/server";

import { apiResponse, serverError, unauthorized } from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import type { AvalonGameConfig, AvalonGameStatus } from "@/types/avalon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ActiveAvalonTable = {
  id: string;
  name: string;
  status: Extract<AvalonGameStatus, "lobby" | "inProgress">;
  playerCount: AvalonGameConfig["playerCount"];
  isCreator: boolean;
};

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unauthorized("کاربر پیدا نشد");
  }

  try {
    const result = await getPostgresPool().query<ActiveAvalonTable>(
      `
        SELECT
          game.id,
          COALESCE(game.table_name, 'میز بدون نام') AS name,
          game.status,
          game.player_count AS "playerCount",
          game.creator_id = $1 AS "isCreator"
        FROM avalon_games AS game
        WHERE
          game.status NOT IN ('completed', 'cancelled')
          AND (
            game.creator_id = $1
            OR EXISTS (
              SELECT 1
              FROM avalon_seats AS seat
              WHERE seat.game_id = game.id AND seat.player_id = $1
            )
          )
        ORDER BY
          CASE WHEN game.status = 'inProgress' THEN 0 ELSE 1 END,
          game.created_at DESC
        LIMIT 1
      `,
      [session.user.id],
    );

    return apiResponse(200, "میز فعال آوالون", result.rows[0] ?? null);
  } catch (error) {
    console.error("Failed to find active Avalon table", error);
    return serverError("بررسی میز فعال آوالون انجام نشد");
  }
}
