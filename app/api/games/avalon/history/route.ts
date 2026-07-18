import { NextRequest } from "next/server";

import { apiResponse, serverError, unauthorized } from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import type { AvalonHistoryItem } from "@/types/avalon-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AvalonHistoryRow = Omit<
  AvalonHistoryItem,
  "createdAt" | "startedAt" | "endedAt"
> & {
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
};

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unauthorized("کاربر پیدا نشد");
  }

  try {
    const result = await getPostgresPool().query<AvalonHistoryRow>(
      `
        WITH relevant_games AS (
          SELECT
            game.id,
            COALESCE(game.table_name, 'میز بدون نام') AS name,
            game.status,
            game.winner_side AS "winnerSide",
            game.player_count AS "playerCount",
            game.created_at AS "createdAt",
            game.started_at AS "startedAt",
            game.ended_at AS "endedAt",
            creator.name AS "creatorName",
            CASE
              WHEN game.started_at IS NULL THEN NULL
              ELSE own_seat.role
            END AS "userRole",
            CASE
              WHEN game.started_at IS NULL OR own_seat.role IS NULL THEN NULL
              WHEN own_seat.role IN ('assassin', 'morgana', 'mordred', 'oberon') THEN 'evil'
              ELSE 'good'
            END AS "userSide"
          FROM avalon_games AS game
          INNER JOIN users AS creator ON creator.id = game.creator_id
          LEFT JOIN LATERAL (
            SELECT seat.role
            FROM avalon_seats AS seat
            WHERE seat.game_id = game.id AND seat.player_id = $1
            LIMIT 1
          ) AS own_seat ON true
          WHERE
            game.status IN ('completed', 'cancelled')
            AND (game.creator_id = $1 OR own_seat.role IS NOT NULL)
        ),
        mission_totals AS (
          SELECT
            phase.game_id,
            phase.id,
            phase.created_at,
            (
              SELECT count(*)::integer
              FROM avalon_quest_team_members AS member
              WHERE member.quest_id = mission.quest_id AND member.seat_id IS NOT NULL
            ) AS member_count,
            (
              SELECT count(*)::integer
              FROM avalon_mission_votes AS vote
              WHERE vote.mission_id = mission.id
            ) AS vote_count,
            (
              SELECT count(*)::integer
              FROM avalon_mission_votes AS vote
              WHERE vote.mission_id = mission.id AND vote.vote = 'fail'
            ) AS fail_count
          FROM avalon_missions AS mission
          INNER JOIN avalon_phases AS phase ON phase.id = mission.phase_id
          INNER JOIN relevant_games AS game ON game.id = phase.game_id
        ),
        numbered_missions AS (
          SELECT
            mission.*,
            row_number() OVER (
              PARTITION BY mission.game_id
              ORDER BY mission.created_at, mission.id
            ) AS mission_round
          FROM mission_totals AS mission
        ),
        mission_summaries AS (
          SELECT
            mission.game_id,
            count(*) FILTER (
              WHERE
                mission.member_count > 0
                AND mission.vote_count >= mission.member_count
                AND mission.fail_count < CASE
                  WHEN game."playerCount" >= 7 AND mission.mission_round = 4 THEN 2
                  ELSE 1
                END
            )::integer AS "successfulMissions",
            count(*) FILTER (
              WHERE
                mission.member_count > 0
                AND mission.vote_count >= mission.member_count
                AND mission.fail_count >= CASE
                  WHEN game."playerCount" >= 7 AND mission.mission_round = 4 THEN 2
                  ELSE 1
                END
            )::integer AS "failedMissions"
          FROM numbered_missions AS mission
          INNER JOIN relevant_games AS game ON game.id = mission.game_id
          GROUP BY mission.game_id
        )
        SELECT
          game.*,
          COALESCE(summary."successfulMissions", 0) AS "successfulMissions",
          COALESCE(summary."failedMissions", 0) AS "failedMissions"
        FROM relevant_games AS game
        LEFT JOIN mission_summaries AS summary ON summary.game_id = game.id
        ORDER BY COALESCE(game."endedAt", game."createdAt") DESC
      `,
      [session.user.id],
    );

    const history: AvalonHistoryItem[] = result.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
    }));

    return apiResponse(200, "تاریخچه میزهای آوالون", history);
  } catch (error) {
    console.error("Failed to load Avalon table history", error);
    return serverError("دریافت تاریخچه میزهای آوالون انجام نشد");
  }
}
