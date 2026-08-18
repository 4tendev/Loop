import { NextRequest } from "next/server";

import {
  apiResponse,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlayerStatsRow = {
  gamesTogether: number;
  sameSideGames: number;
  sameSideWins: number;
  oppositeSideGames: number;
  oppositeSideWins: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function winRate(wins: number, games: number) {
  return games === 0 ? 0 : Math.round((wins / games) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);
  if (!session) return unauthorized("ابتدا وارد حساب خود شوید");

  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId || !uuidPattern.test(playerId)) {
    return badRequest("شناسه بازیکن نامعتبر است");
  }

  try {
    const result = await getPostgresPool().query<PlayerStatsRow>(
      `
        WITH shared_games AS (
          SELECT
            game.winner_side AS "winnerSide",
            CASE
              WHEN viewer_seat.role IN ('assassin', 'morgana', 'mordred', 'oberon') THEN 'evil'
              ELSE 'good'
            END AS "viewerSide",
            CASE
              WHEN player_seat.role IN ('assassin', 'morgana', 'mordred', 'oberon') THEN 'evil'
              ELSE 'good'
            END AS "playerSide"
          FROM avalon_games AS game
          INNER JOIN avalon_seats AS viewer_seat
            ON viewer_seat.game_id = game.id AND viewer_seat.player_id = $1
          INNER JOIN avalon_seats AS player_seat
            ON player_seat.game_id = game.id AND player_seat.player_id = $2
          WHERE game.status = 'completed' AND game.winner_side IS NOT NULL
        )
        SELECT
          count(*)::integer AS "gamesTogether",
          count(*) FILTER (WHERE "viewerSide" = "playerSide")::integer AS "sameSideGames",
          count(*) FILTER (
            WHERE "viewerSide" = "playerSide" AND "winnerSide" = "playerSide"
          )::integer AS "sameSideWins",
          count(*) FILTER (WHERE "viewerSide" <> "playerSide")::integer AS "oppositeSideGames",
          count(*) FILTER (
            WHERE "viewerSide" <> "playerSide" AND "winnerSide" = "playerSide"
          )::integer AS "oppositeSideWins"
        FROM shared_games
      `,
      [session.user.id, playerId],
    );

    const stats = result.rows[0] ?? {
      gamesTogether: 0,
      sameSideGames: 0,
      sameSideWins: 0,
      oppositeSideGames: 0,
      oppositeSideWins: 0,
    };

    return apiResponse(200, "آمار بازی‌های مشترک", {
      gamesTogether: stats.gamesTogether,
      sameSide: {
        games: stats.sameSideGames,
        wins: stats.sameSideWins,
        winRate: winRate(stats.sameSideWins, stats.sameSideGames),
      },
      oppositeSide: {
        games: stats.oppositeSideGames,
        wins: stats.oppositeSideWins,
        winRate: winRate(stats.oppositeSideWins, stats.oppositeSideGames),
      },
    });
  } catch (error) {
    console.error("Failed to load shared Avalon player stats", error);
    return serverError("دریافت آمار بازیکن انجام نشد");
  }
}
