import { pool } from "./database.mjs";

export async function getActiveAvalonGames({ includeGameIds = [] } = {}) {
  await ensureAvalonMessageColumns();

  const result = await pool.query(
    `
    SELECT
      game.id,
      game.status,
      game.winner_side AS "winnerSide",
      game.player_count AS "playerCount",
      game.use_oberon AS "useOberon",
      game.use_lady_of_the_lake AS "useLadyOfTheLake",
      game.role_exposing AS "roleExposing",
      game.public_message AS "publicMessage",
      game.created_at AS "createdAt",
      game.started_at AS "startedAt",
      game.ended_at AS "endedAt",
      creator.id AS "creatorId",
      creator.name AS "creatorName",
      creator.profile_image AS "creatorProfileImage",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', phase.id,
              'type', CASE
                WHEN night.id IS NOT NULL THEN 'night'
                WHEN quest.id IS NOT NULL THEN 'quest'
                WHEN mission.id IS NOT NULL THEN 'mission'
                WHEN lady_check.id IS NOT NULL THEN 'ladyCheck'
                WHEN assassination.id IS NOT NULL THEN 'assassination'
                ELSE 'unknown'
              END,
              'createdAt', phase.created_at,
              'endedAt', phase.ended_at,
              'night', CASE
                WHEN night.id IS NULL THEN NULL
                ELSE json_build_object(
                  'checkedCount', (
                    SELECT count(*)
                    FROM avalon_night_checks night_check
                    WHERE night_check.night_id = night.id
                      AND night_check.is_checked = true
                  ),
                  'totalCount', (
                    SELECT count(*)
                    FROM avalon_night_checks night_check
                    WHERE night_check.night_id = night.id
                  )
                )
              END,
              'quest', CASE
                WHEN quest.id IS NULL THEN NULL
                ELSE json_build_object(
                  'kingSeatNumber', king_seat.number,
                  'kingPlayerName', king_player.name,
                  'teamMemberCount', (
                    SELECT count(*)
                    FROM avalon_quest_team_members team_member
                    WHERE team_member.quest_id = quest.id
                      AND team_member.seat_id IS NOT NULL
                  ),
                  'teamMemberSeatIds', COALESCE(
                    (
                      SELECT json_agg(team_member_seat.id ORDER BY team_member_seat.number)
                      FROM avalon_quest_team_members team_member
                      INNER JOIN avalon_seats team_member_seat
                        ON team_member_seat.id = team_member.seat_id
                      WHERE team_member.quest_id = quest.id
                    ),
                    '[]'::json
                  ),
                  'teamMemberSeatNumbers', COALESCE(
                    (
                      SELECT json_agg(team_member_seat.number ORDER BY team_member_seat.number)
                      FROM avalon_quest_team_members team_member
                      INNER JOIN avalon_seats team_member_seat
                        ON team_member_seat.id = team_member.seat_id
                      WHERE team_member.quest_id = quest.id
                    ),
                    '[]'::json
                  ),
                  'teamSlotCount', (
                    SELECT count(*)
                    FROM avalon_quest_team_members team_member
                    WHERE team_member.quest_id = quest.id
                  ),
                  'decisionCount', (
                    SELECT count(*)
                    FROM avalon_quest_decisions decision
                    WHERE decision.quest_id = quest.id
                  )
                )
              END,
              'mission', CASE
                WHEN mission.id IS NULL THEN NULL
                ELSE json_build_object(
                  'missionRound', mission_summary."missionRound",
                  'teamMemberCount', mission_summary."teamMemberCount",
                  'voteCount', mission_summary."voteCount",
                  'successCount', mission_summary."successCount",
                  'failCount', mission_summary."failCount",
                  'result', CASE
                    WHEN
                      mission_summary."teamMemberCount" > 0
                      AND mission_summary."voteCount" >= mission_summary."teamMemberCount"
                    THEN CASE
                      WHEN mission_summary."failCount" >= CASE
                        WHEN game.player_count >= 7 AND mission_summary."missionRound" = 4 THEN 2
                        ELSE 1
                      END THEN 'failed'
                      ELSE 'succeeded'
                    END
                    ELSE NULL
                  END
                )
              END,
              'ladyCheck', CASE
                WHEN lady_check.id IS NULL THEN NULL
                ELSE json_build_object(
                  'id', lady_check.id,
                  'ladySeatId', lady_seat.id,
                  'ladySeatNumber', lady_seat.number,
                  'targetSeatId', lady_target_seat.id,
                  'targetSeatNumber', lady_target_seat.number,
                  'targetSide', CASE
                    WHEN lady_target_seat.role IS NULL THEN NULL
                    WHEN lady_target_seat.role IN ('assassin', 'morgana', 'mordred', 'oberon')
                    THEN 'evil'
                    ELSE 'good'
                  END
                )
              END
            )
            ORDER BY phase.created_at
          )
          FROM avalon_phases phase
          LEFT JOIN avalon_nights night ON night.phase_id = phase.id
          LEFT JOIN avalon_quests quest ON quest.phase_id = phase.id
          LEFT JOIN avalon_seats king_seat ON king_seat.id = quest.king_seat_id
          LEFT JOIN users king_player ON king_player.id = king_seat.player_id
          LEFT JOIN avalon_missions mission ON mission.phase_id = phase.id
          LEFT JOIN LATERAL (
            SELECT
              (
                SELECT count(*)::integer
                FROM avalon_missions round_mission
                INNER JOIN avalon_phases round_phase
                  ON round_phase.id = round_mission.phase_id
                WHERE
                  round_phase.game_id = game.id
                  AND (
                    round_phase.created_at < phase.created_at
                    OR (
                      round_phase.created_at = phase.created_at
                      AND round_phase.id <= phase.id
                    )
                  )
              ) AS "missionRound",
              (
                SELECT count(*)::integer
                FROM avalon_quest_team_members team_member
                WHERE
                  team_member.quest_id = mission.quest_id
                  AND team_member.seat_id IS NOT NULL
              ) AS "teamMemberCount",
              (
                SELECT count(*)::integer
                FROM avalon_mission_votes mission_vote
                WHERE mission_vote.mission_id = mission.id
              ) AS "voteCount",
              (
                SELECT count(*)::integer
                FROM avalon_mission_votes mission_vote
                WHERE
                  mission_vote.mission_id = mission.id
                  AND mission_vote.vote = 'success'
              ) AS "successCount",
              (
                SELECT count(*)::integer
                FROM avalon_mission_votes mission_vote
                WHERE
                  mission_vote.mission_id = mission.id
                  AND mission_vote.vote = 'fail'
              ) AS "failCount"
          ) mission_summary ON mission.id IS NOT NULL
          LEFT JOIN avalon_lady_checks lady_check ON lady_check.phase_id = phase.id
          LEFT JOIN avalon_seats lady_seat ON lady_seat.id = lady_check.lady_seat_id
          LEFT JOIN avalon_seats lady_target_seat
            ON lady_target_seat.id = lady_check.target_seat_id
          LEFT JOIN avalon_assassinations assassination ON assassination.phase_id = phase.id
          WHERE phase.game_id = game.id
        ),
        '[]'::json
      ) AS phases,
      COALESCE(
        json_agg(
          json_build_object(
            'id', seat.id,
            'number', seat.number,
            'role', seat.role,
            'privateMessage', seat.private_message,
            'actionRequired', CASE
              WHEN seat.action_required_type IS NULL OR seat.action_required_id IS NULL THEN NULL
              ELSE json_build_object(
                'type', seat.action_required_type,
                'id', seat.action_required_id
              )
            END,
            'player', CASE
              WHEN player.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', player.id,
                'name', player.name,
                'profileImage', player.profile_image
              )
            END
          )
          ORDER BY seat.number
        ) FILTER (WHERE seat.id IS NOT NULL),
        '[]'::json
      ) AS seats
    FROM avalon_games game
    INNER JOIN users creator ON creator.id = game.creator_id
    LEFT JOIN avalon_seats seat ON seat.game_id = game.id
    LEFT JOIN users player ON player.id = seat.player_id
    WHERE
      game.status NOT IN ('completed', 'cancelled')
      OR game.id::text = ANY($1::text[])
    GROUP BY game.id, creator.id
    ORDER BY game.created_at DESC
  `,
    [includeGameIds],
  );

  return result.rows.map((row) => ({
    id: row.id,
    status: row.status,
    winnerSide: row.winnerSide,
    config: {
      playerCount: row.playerCount,
      useOberon: row.useOberon,
      useLadyOfTheLake: row.useLadyOfTheLake,
      roleExposing: row.roleExposing,
    },
    publicMessage: row.publicMessage,
    creator: {
      id: row.creatorId,
      name: row.creatorName,
      profileImage: row.creatorProfileImage,
    },
    seats: row.seats,
    occupiedSeatCount: row.seats.filter((seat) => seat.player !== null).length,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    phases: row.phases,
  }));
}

async function ensureAvalonMessageColumns() {
  await pool.query(`
    ALTER TABLE avalon_games
    ADD COLUMN IF NOT EXISTS public_message text NOT NULL DEFAULT 'بازی در مرحله لابی است.'
  `);
  await pool.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS private_message text
  `);
  await pool.query(`
    UPDATE avalon_seats
    SET private_message = ''
    WHERE private_message IS NULL
  `);
  await pool.query(`
    ALTER TABLE avalon_seats
    ALTER COLUMN private_message SET DEFAULT '',
    ALTER COLUMN private_message SET NOT NULL
  `);
  await pool.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS action_required_type text
  `);
  await pool.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS action_required_id uuid
  `);
}
