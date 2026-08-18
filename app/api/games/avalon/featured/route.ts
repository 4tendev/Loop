import { apiResponse, serverError } from "@/lib/api-response";
import { getPostgresPool } from "@/lib/postgres";
import type { AvalonGameStatus, AvalonSide } from "@/types/avalon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FeaturedSeat = {
  number: number;
  playerName: string | null;
  playerProfileImage: string | null;
};

type FeaturedGameRow = {
  id: string;
  name: string;
  status: Exclude<AvalonGameStatus, "cancelled">;
  winnerSide: AvalonSide | null;
  playerCount: number;
  publicMessage: string;
  seats: FeaturedSeat[];
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
            json_agg(
              json_build_object(
                'number', seat.number,
                'playerName', player.name,
                'playerProfileImage', player.profile_image
              )
              ORDER BY seat.number
            ) FILTER (WHERE seat.id IS NOT NULL),
            '[]'::json
          ) AS seats
        FROM featured_game AS game
        LEFT JOIN avalon_seats AS seat ON seat.game_id = game.id
        LEFT JOIN users AS player ON player.id = seat.player_id
        GROUP BY game.id, game.table_name, game.status, game.winner_side,
          game.player_count, game.public_message, game.created_at, game.ended_at
      `,
    );

    return apiResponse(200, "میز منتخب آوالون", result.rows[0] ?? null);
  } catch (error) {
    console.error("Failed to load featured Avalon game", error);
    return serverError("دریافت میز منتخب آوالون انجام نشد");
  }
}
