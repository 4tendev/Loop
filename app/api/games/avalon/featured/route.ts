import { apiResponse, serverError } from "@/lib/api-response";
import { getPostgresPool } from "@/lib/postgres";
import type {
  AvalonGameStatus,
  AvalonRoleName,
  AvalonSide,
} from "@/types/avalon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FeaturedSeat = {
  number: number;
  playerName: string | null;
  playerProfileImage: string | null;
  role: AvalonRoleName | null;
};

type FeaturedMission = {
  round: number;
  result: "success" | "fail" | null;
};

type FeaturedGameRow = {
  id: string;
  name: string;
  status: Exclude<AvalonGameStatus, "cancelled">;
  winnerSide: AvalonSide | null;
  playerCount: number;
  publicMessage: string;
  seats: FeaturedSeat[];
  missions: FeaturedMission[];
};

export async function GET() {
  try {
    const result = await getPostgresPool().query<FeaturedGameRow>(
      `
        WITH featured_game AS (
          SELECT game.*
          FROM avalon_games AS game
          WHERE game.status <> 'cancelled'
          ORDER BY
            CASE game.status
              WHEN 'inProgress' THEN 0
              WHEN 'lobby' THEN 1
              ELSE 2
            END,
            CASE
              WHEN game.status = 'completed' THEN game.ended_at
              ELSE game.created_at
            END DESC NULLS LAST
          LIMIT 1
        )
        SELECT
          game.id,
          COALESCE(game.table_name, 'میز بدون نام') AS name,
          game.status,
          game.winner_side AS "winnerSide",
          game.player_count AS "playerCount",
          game.public_message AS "publicMessage",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'number', seat.number,
                  'playerName', player.name,
                  'playerProfileImage', player.profile_image,
                  'role', CASE WHEN game.status = 'completed' THEN seat.role ELSE NULL END
                )
                ORDER BY seat.number
              )
              FROM avalon_seats AS seat
              LEFT JOIN users AS player ON player.id = seat.player_id
              WHERE seat.game_id = game.id
            ),
            '[]'::json
          ) AS seats,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'round', mission.mission_round,
                  'result', CASE
                    WHEN mission.member_count = 0 OR mission.vote_count < mission.member_count THEN NULL
                    WHEN mission.fail_count >= CASE
                      WHEN game.player_count >= 7 AND mission.mission_round = 4 THEN 2
                      ELSE 1
                    END THEN 'fail'
                    ELSE 'success'
                  END
                )
                ORDER BY mission.mission_round
              )
              FROM (
                SELECT
                  row_number() OVER (ORDER BY phase.created_at, phase.id)::integer AS mission_round,
                  (
                    SELECT count(*)::integer
                    FROM avalon_quest_team_members AS member
                    WHERE member.quest_id = avalon_mission.quest_id
                      AND member.seat_id IS NOT NULL
                  ) AS member_count,
                  (
                    SELECT count(*)::integer
                    FROM avalon_mission_votes AS vote
                    WHERE vote.mission_id = avalon_mission.id
                  ) AS vote_count,
                  (
                    SELECT count(*)::integer
                    FROM avalon_mission_votes AS vote
                    WHERE vote.mission_id = avalon_mission.id AND vote.vote = 'fail'
                  ) AS fail_count
                FROM avalon_missions AS avalon_mission
                INNER JOIN avalon_phases AS phase ON phase.id = avalon_mission.phase_id
                WHERE phase.game_id = game.id
              ) AS mission
            ),
            '[]'::json
          ) AS missions
        FROM featured_game AS game
      `,
    );

    return apiResponse(200, "میز منتخب آوالون", result.rows[0] ?? null);
  } catch (error) {
    console.error("Failed to load featured Avalon game", error);
    return serverError("دریافت میز منتخب آوالون انجام نشد");
  }
}
