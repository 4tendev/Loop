import { pool } from "./database.mjs";
import { blockTerminalAvalonGameAction } from "./game-status.mjs";

const AVALON_ROLE_LABELS = {
  merlin: "مرلین",
  percival: "پرسیوال",
  servant: "خدمتگزار وفادار",
  assassin: "قاتل",
  morgana: "مورگانا",
  mordred: "موردرد",
  oberon: "اوبرون",
};
const AVALON_EVIL_ROLES = new Set(["assassin", "morgana", "mordred", "oberon"]);
const AVALON_VISIBLE_EVIL_MATE_ROLES = new Set([
  "assassin",
  "morgana",
  "mordred",
]);
const AVALON_DECISION_RESULT_LABELS = {
  approved: "تأیید شد",
  disapproved: "رد شد",
};
const AVALON_MISSION_RESULT_LABELS = {
  succeeded: "موفق",
  failed: "ناموفق",
};
const AVALON_MISSION_RULES_BY_PLAYER_COUNT = {
  5: [
    { players: 2, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 2, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
  ],
  6: [
    { players: 2, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
  ],
  7: [
    { players: 2, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 2 },
    { players: 4, minimumFailures: 1 },
  ],
  8: [
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 5, minimumFailures: 2 },
    { players: 5, minimumFailures: 1 },
  ],
  9: [
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 5, minimumFailures: 2 },
    { players: 5, minimumFailures: 1 },
  ],
  10: [
    { players: 3, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 4, minimumFailures: 1 },
    { players: 5, minimumFailures: 2 },
    { players: 5, minimumFailures: 1 },
  ],
};

function formatAvalonSeatList(
  seats,
  { showRole = false, showSide = false } = {},
) {
  if (seats.length === 0) {
    return "هیچ‌کس";
  }

  return seats
    .map((seat) => {
      const details = [];

      if (showSide) {
        details.push(AVALON_EVIL_ROLES.has(seat.role) ? "شر" : "خیر");
      }

      if (showRole) {
        details.push(AVALON_ROLE_LABELS[seat.role] ?? seat.role);
      }

      return details.length > 0
        ? `صندلی ${seat.number} (${details.join("، ")})`
        : `صندلی ${seat.number}`;
    })
    .join("، ");
}

function buildAvalonNightPrivateMessage(seat, seats, roleExposing) {
  const messageParts = [
    `نقش شما: ${AVALON_ROLE_LABELS[seat.role] ?? seat.role}.`,
  ];

  if (seat.role === "merlin") {
    const visibleEvilSeats = seats.filter((otherSeat) =>
      ["assassin", "morgana", "oberon"].includes(otherSeat.role),
    );

    messageParts.push(
      `بازیکنان سمت شر که می‌بینی، بدون نقش دقیق: ${formatAvalonSeatList(
        visibleEvilSeats,
        { showSide: true },
      )}.`,
    );
  }

  if (seat.role === "percival") {
    const visibleMysterySeats = seats.filter((otherSeat) =>
      ["merlin", "morgana"].includes(otherSeat.role),
    );

    messageParts.push(
      `بازیکنان مهمی که می‌بینی، بدون مشخص شدن نقش یا سمت: ${formatAvalonSeatList(
        visibleMysterySeats,
      )}.`,
    );
  }

  if (["mordred", "morgana", "assassin"].includes(seat.role)) {
    const evilMateSeats = seats.filter(
      (otherSeat) =>
        otherSeat.id !== seat.id &&
        AVALON_VISIBLE_EVIL_MATE_ROLES.has(otherSeat.role),
    );

    messageParts.push(
      `یاران سمت شر شما: ${formatAvalonSeatList(evilMateSeats, {
        showSide: true,
        showRole: roleExposing,
      })}.`,
    );
  }

  return messageParts.join(" ");
}

function getAvalonMissionRule(playerCount, targetMissionRound) {
  const roundIndex = Number(targetMissionRound) - 1;
  const missionRule =
    AVALON_MISSION_RULES_BY_PLAYER_COUNT[playerCount]?.[roundIndex] ?? null;

  if (!missionRule) {
    throw new Error("Expected valid Avalon mission round");
  }

  return missionRule;
}

async function createAvalonPhase(client, gameId) {
  const phaseResult = await client.query(
    `
      INSERT INTO avalon_phases (game_id)
      VALUES ($1)
      RETURNING id
    `,
    [gameId],
  );

  const phase = phaseResult.rows[0];

  if (!phase) {
    throw new Error("Expected created Avalon phase");
  }

  return phase;
}
async function createAvalonNight(client, phaseID) {
  const phaseResult = await client.query(
    `
      INSERT INTO avalon_nights (id, phase_id)
      VALUES ($1, $1)
      RETURNING id
    `,
    [phaseID],
  );
  const night = phaseResult.rows[0];

  if (!night) {
    throw new Error("Expected created Avalon night");
  }

  return night;
}

async function createAvalonQuest(client, phaseID, kingSeatId) {
  const questResult = await client.query(
    `
      INSERT INTO avalon_quests (id, phase_id, king_seat_id)
      VALUES ($1, $1, $2)
      RETURNING id
    `,
    [phaseID, kingSeatId],
  );
  const quest = questResult.rows[0];

  if (!quest) {
    throw new Error("Expected created Avalon quest");
  }

  return quest;
}

export async function createAvalonAssassinationPhase(client, gameId) {
  const phase = await createAvalonPhase(client, gameId);
  const assassinSeatResult = await client.query(
    `
      SELECT id, number
      FROM avalon_seats
      WHERE game_id = $1 AND role = 'assassin'
      LIMIT 1
    `,
    [gameId],
  );
  const assassinSeat = assassinSeatResult.rows[0];

  if (!assassinSeat) {
    throw new Error("Expected Avalon assassin seat");
  }

  const assassinationResult = await client.query(
    `
      INSERT INTO avalon_assassinations (id, phase_id)
      VALUES ($1, $1)
      RETURNING id
    `,
    [phase.id],
  );
  const assassination = assassinationResult.rows[0];

  if (!assassination) {
    throw new Error("Expected created Avalon assassination");
  }

  await createAvalonPublicMessage(
    client,
    gameId,
    "منتظر پایان ترور هستیم.",
  );
  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = CASE
          WHEN id = $2 THEN 'شما قاتل هستید. مرلین را انتخاب کنید.'
          ELSE 'منتظر پایان ترور هستیم.'
        END,
        action_required_type = CASE
          WHEN id = $2 THEN 'avalon.assassinAction'
          ELSE NULL
        END,
        action_required_id = CASE
          WHEN id = $2 THEN $3::uuid
          ELSE NULL
        END
      WHERE game_id = $1
    `,
    [gameId, assassinSeat.id, assassination.id],
  );

  return {
    phase,
    assassination,
    assassinSeatId: assassinSeat.id,
    assassinSeatNumber: assassinSeat.number,
  };
}

export async function getAvalonGameProgressSummary(client, gameId) {
  const progressSummaryResult = await client.query(
    `
      WITH last_mission_phase AS (
        SELECT phase.created_at
        FROM avalon_missions mission
        INNER JOIN avalon_phases phase ON phase.id = mission.phase_id
        WHERE phase.game_id = $1
        ORDER BY phase.created_at DESC
        LIMIT 1
      ),
      last_quest_king AS (
        SELECT seat.number AS "lastQuestKingSeatNumber"
        FROM avalon_quests quest
        INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
        INNER JOIN avalon_seats seat ON seat.id = quest.king_seat_id
        WHERE phase.game_id = $1
        ORDER BY phase.created_at DESC, phase.id DESC
        LIMIT 1
      ),
      mission_summaries AS (
        SELECT
          mission.id,
          game.player_count AS "playerCount",
          row_number() OVER (
            ORDER BY phase.created_at, phase.id
          )::integer AS "missionRound",
          (
            SELECT count(*)::integer
            FROM avalon_quest_team_members team_member
            WHERE team_member.quest_id = mission.quest_id
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
              AND mission_vote.vote = 'fail'
          ) AS "failCount"
        FROM avalon_missions mission
        INNER JOIN avalon_phases phase ON phase.id = mission.phase_id
        INNER JOIN avalon_games game ON game.id = phase.game_id
        WHERE phase.game_id = $1
      ),
      completed_mission_results AS (
        SELECT
          CASE
            WHEN "failCount" >= CASE
              WHEN "playerCount" >= 7 AND "missionRound" = 4 THEN 2
              ELSE 1
            END THEN 'failed'
            ELSE 'succeeded'
          END AS result
        FROM mission_summaries
        WHERE "voteCount" >= "teamMemberCount"
      ),
      lady_of_the_lake_checks AS (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'ladySeatId', lady_seat.id
            )
            ORDER BY phase.created_at, phase.id
          ),
          '[]'::json
        ) AS "ladyOfTheLake"
        FROM avalon_lady_checks lady_check
        INNER JOIN avalon_phases phase ON phase.id = lady_check.phase_id
        INNER JOIN avalon_seats lady_seat ON lady_seat.id = lady_check.lady_seat_id
        WHERE phase.game_id = $1
      )
      SELECT
        (
          SELECT count(*)::integer
          FROM avalon_missions mission
          INNER JOIN avalon_phases phase ON phase.id = mission.phase_id
          WHERE phase.game_id = $1
        ) AS "missionPhaseCount",
        count(quest.id)::integer AS "questPhaseCountUntilLastMission",
        (
          SELECT count(*)::integer
          FROM completed_mission_results
          WHERE result = 'succeeded'
        ) AS "successfulMissionCount",
        (
          SELECT count(*)::integer
          FROM completed_mission_results
          WHERE result = 'failed'
        ) AS "failedMissionCount",
        (
          SELECT "lastQuestKingSeatNumber"
          FROM last_quest_king
        ) AS "lastQuestKingSeatNumber",
        (
          SELECT "ladyOfTheLake"
          FROM lady_of_the_lake_checks
        ) AS "ladyOfTheLake"
      FROM avalon_quests quest
      INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
      LEFT JOIN last_mission_phase ON true
      WHERE
        phase.game_id = $1
        AND (
          last_mission_phase.created_at IS NULL
          OR phase.created_at > last_mission_phase.created_at
        )
    `,
    [gameId],
  );

  return {
    missionPhaseCount: progressSummaryResult.rows[0]?.missionPhaseCount ?? 0,
    questPhaseCountUntilLastMission:
      progressSummaryResult.rows[0]?.questPhaseCountUntilLastMission ?? 0,
    successfulMissionCount:
      progressSummaryResult.rows[0]?.successfulMissionCount ?? 0,
    failedMissionCount:
      progressSummaryResult.rows[0]?.failedMissionCount ?? 0,
    lastQuestKingSeatNumber:
      progressSummaryResult.rows[0]?.lastQuestKingSeatNumber ?? null,
    ladyOfTheLake: progressSummaryResult.rows[0]?.ladyOfTheLake ?? [],
  };
}

async function createAvalonMissionPhase(client, questId) {
  const questResult = await client.query(
    `
      SELECT phase.game_id AS "gameId"
      FROM avalon_quests quest
      INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
      WHERE quest.id = $1
    `,
    [questId],
  );
  const quest = questResult.rows[0];

  if (!quest) {
    throw new Error("Expected Avalon quest for mission phase");
  }

  const phase = await createAvalonPhase(client, quest.gameId);
  const missionResult = await client.query(
    `
      INSERT INTO avalon_missions (id, phase_id, quest_id)
      VALUES ($1, $1, $2)
      RETURNING id
    `,
    [phase.id, questId],
  );
  const mission = missionResult.rows[0];

  if (!mission) {
    throw new Error("Expected created Avalon mission");
  }

  const missionSeatResult = await client.query(
    `
      SELECT seat.id
      FROM avalon_quest_team_members team_member
      INNER JOIN avalon_seats seat ON seat.id = team_member.seat_id
      WHERE team_member.quest_id = $1
      ORDER BY seat.number
    `,
    [questId],
  );

  await createAvalonMissionVotes(client, missionSeatResult.rows, mission.id);
  await createAvalonPublicMessage(
    client,
    quest.gameId,
    "منتظر نتیجه رأی ماموریت هستیم.",
  );

  return {
    phase,
    mission,
  };
}

async function createAvalonMissionVotes(client, seats, missionId) {
  const seatIds = seats
    .map((seat) => (typeof seat === "string" ? seat : seat?.id))
    .filter((seatId) => typeof seatId === "string" && seatId.length > 0);

  if (seatIds.length !== seats.length || seatIds.length === 0) {
    throw new Error("Expected Avalon mission seats");
  }

  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = 'لطفاً برای ماموریت رأی بدهید.',
        action_required_type = 'avalon.missionVote',
        action_required_id = $1
      WHERE id = ANY($2::uuid[])
    `,
    [missionId, seatIds],
  );
}

async function createAvalonLadyOfTheLakePhaseWithClient(client, gameId) {
  function skipLadyOfTheLakePhase(message) {
    console.log(`مرحله بانوی دریاچه ایجاد نشد: ${message}`);

    return {
      ok: false,
      message,
    };
  }

  const gameResult = await client.query(
    `
      SELECT
        game.id,
        game.use_lady_of_the_lake AS "useLadyOfTheLake",
        (
          SELECT count(*)::integer
          FROM avalon_missions mission
          INNER JOIN avalon_phases mission_phase
            ON mission_phase.id = mission.phase_id
          WHERE mission_phase.game_id = game.id
        ) AS "missionPhaseCount",
        (
          SELECT count(*)::integer
          FROM avalon_lady_checks lady_check
          INNER JOIN avalon_phases lady_phase
            ON lady_phase.id = lady_check.phase_id
          WHERE lady_phase.game_id = game.id
        ) AS "ladyCheckCount"
      FROM avalon_games game
      WHERE
        game.id = $1
        AND game.status = 'inProgress'
    `,
    [gameId],
  );
  const game = gameResult.rows[0];

  if (!game) {
    return skipLadyOfTheLakePhase("بازی آوالون در جریان نیست");
  }

  if (!game.useLadyOfTheLake) {
    return skipLadyOfTheLakePhase(
      "بانوی دریاچه برای این بازی فعال نیست",
    );
  }

  if (game.missionPhaseCount < 2) {
    return skipLadyOfTheLakePhase(
      "بانوی دریاچه فقط بعد از ۲ ماموریت می‌تواند ایجاد شود",
    );
  }



  const ladySeatResult = await client.query(
    `
      WITH first_quest AS (
        SELECT quest.king_seat_id
        FROM avalon_quests quest
        INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
        WHERE phase.game_id = $1
        ORDER BY phase.created_at, phase.id
        LIMIT 1
      ),
      last_lady_check AS (
        SELECT lady_check.target_seat_id
        FROM avalon_lady_checks lady_check
        INNER JOIN avalon_phases phase ON phase.id = lady_check.phase_id
        WHERE phase.game_id = $1
        ORDER BY phase.created_at DESC, phase.id DESC
        LIMIT 1
      ),
      first_quest_king AS (
        SELECT seat.number AS king_number
        FROM first_quest
        INNER JOIN avalon_seats seat ON seat.id = first_quest.king_seat_id
      ),
      occupied_seats AS (
        SELECT id, number
        FROM avalon_seats
        WHERE
          game_id = $1
          AND player_id IS NOT NULL
      ),
      first_lady AS (
        SELECT occupied_seats.id, occupied_seats.number
        FROM occupied_seats
        CROSS JOIN first_quest_king
        ORDER BY
          CASE WHEN occupied_seats.number < first_quest_king.king_number THEN 0 ELSE 1 END,
          occupied_seats.number DESC
        LIMIT 1
      )
      SELECT occupied_seats.id, occupied_seats.number
      FROM occupied_seats
      WHERE occupied_seats.id = COALESCE(
        (SELECT target_seat_id FROM last_lady_check),
        (SELECT id FROM first_lady)
      )
    `,
    [gameId],
  );
  const ladySeat = ladySeatResult.rows[0];

  if (!ladySeat) {
    return skipLadyOfTheLakePhase("صندلی بانوی دریاچه پیدا نشد");
  }

  const placeholderTargetResult = await client.query(
    `
      SELECT id, number
      FROM avalon_seats
      WHERE
        game_id = $1
        AND player_id IS NOT NULL
        AND id <> $2
      ORDER BY number
      LIMIT 1
    `,
    [gameId, ladySeat.id],
  );
  const placeholderTargetSeat = placeholderTargetResult.rows[0];

  if (!placeholderTargetSeat) {
    return skipLadyOfTheLakePhase("صندلی هدف بانوی دریاچه پیدا نشد");
  }

  const phase = await createAvalonPhase(client, gameId);
  const ladyCheckResult = await client.query(
    `
      INSERT INTO avalon_lady_checks (
        id,
        phase_id,
        lady_seat_id,
        target_seat_id
      )
      VALUES ($1, $1, $2, $3)
      RETURNING id
    `,
    [phase.id, ladySeat.id, placeholderTargetSeat.id],
  );
  const ladyCheck = ladyCheckResult.rows[0];

  if (!ladyCheck) {
    return skipLadyOfTheLakePhase("مرحله بانوی دریاچه ایجاد نشد");
  }

  await createAvalonPublicMessage(
    client,
    gameId,
    "منتظر انتخاب هدف توسط بانوی دریاچه هستیم.",
  );
  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = CASE
          WHEN id = $2 THEN 'شما بانوی دریاچه هستید. هدف خود را انتخاب کنید.'
          ELSE ''
        END,
        action_required_type = CASE
          WHEN id = $2 THEN 'avalon.ladyTarget'
          ELSE NULL
        END,
        action_required_id = CASE
          WHEN id = $2 THEN $3::uuid
          ELSE NULL
        END
      WHERE game_id = $1
    `,
    [gameId, ladySeat.id, ladyCheck.id],
  );

  return {
    ok: true,
    message: "مرحله بانوی دریاچه ایجاد شد",
    gameId,
    ladyCheckId: ladyCheck.id,
    ladySeatId: ladySeat.id,
    ladySeatNumber: ladySeat.number,
  };
}

export async function createAvalonLadyOfTheLakePhase(gameId) {
  if (typeof gameId !== "string" || gameId.length === 0) {
    return {
      ok: false,
      message: "شناسه بازی نامعتبر است",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_lady_of_the_lake:${gameId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const result = await createAvalonLadyOfTheLakePhaseWithClient(
      client,
      gameId,
    );

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function endAvalonQuestPhaseByQuestId(client, gameId, questId) {
  const phaseResult = await client.query(
    `
      UPDATE avalon_phases phase
      SET ended_at = now()
      FROM avalon_quests quest
      WHERE
        quest.id = $2
        AND quest.phase_id = phase.id
        AND phase.game_id = $1
        AND phase.ended_at IS NULL
      RETURNING phase.id
    `,
    [gameId, questId],
  );

  if (!phaseResult.rows[0]) {
    throw new Error("Expected active Avalon quest phase");
  }
}

async function ensureAvalonQuestTeamMemberSlotsSchema(client) {
  await client.query(`
    ALTER TABLE avalon_quest_team_members
    ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid()
  `);
  await client.query(`
    UPDATE avalon_quest_team_members
    SET id = gen_random_uuid()
    WHERE id IS NULL
  `);
  await client.query(`
    ALTER TABLE avalon_quest_team_members
    ALTER COLUMN id SET NOT NULL
  `);
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint constraint_info
        INNER JOIN pg_attribute attribute_info
          ON attribute_info.attrelid = constraint_info.conrelid
          AND attribute_info.attname = 'id'
        WHERE
          constraint_info.conrelid = 'avalon_quest_team_members'::regclass
          AND constraint_info.contype = 'p'
          AND constraint_info.conkey <> ARRAY[attribute_info.attnum]
      ) THEN
        ALTER TABLE avalon_quest_team_members
        DROP CONSTRAINT avalon_quest_team_members_pkey;
      END IF;
    END $$;
  `);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE
          conrelid = 'avalon_quest_team_members'::regclass
          AND contype = 'p'
      ) THEN
        ALTER TABLE avalon_quest_team_members
        ADD CONSTRAINT avalon_quest_team_members_pkey PRIMARY KEY (id);
      END IF;
    END $$;
  `);
  await client.query(`
    ALTER TABLE avalon_quest_team_members
    ALTER COLUMN seat_id DROP NOT NULL
  `);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE
          conrelid = 'avalon_quest_team_members'::regclass
          AND conname = 'avalon_quest_team_members_quest_id_seat_id_key'
      ) THEN
        ALTER TABLE avalon_quest_team_members
        ADD CONSTRAINT avalon_quest_team_members_quest_id_seat_id_key
        UNIQUE (quest_id, seat_id);
      END IF;
    END $$;
  `);
}

async function createAvalonQuestTeamMemberSlots(client, questId, slotCount) {
  await ensureAvalonQuestTeamMemberSlotsSchema(client);
  await client.query(
    `
      INSERT INTO avalon_quest_team_members (quest_id, seat_id)
      SELECT $1, NULL
      FROM generate_series(1, $2::integer)
    `,
    [questId, slotCount],
  );
}

async function createAvalonPublicMessage(client, gameId, message) {
  await client.query(
    `
      UPDATE avalon_games
      SET public_message = $2
      WHERE id = $1
    `,
    [gameId, message],
  );
}

async function createAvalonPrivateMessage(client, seatId, message) {
  await client.query(
    `
      UPDATE avalon_seats
      SET private_message = $2
      WHERE id = $1
    `,
    [seatId, message],
  );
}

function normalizeAvalonNominatedSeatValues(nominatedSeats) {
  if (!Array.isArray(nominatedSeats)) {
    return null;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const normalizedSeats = nominatedSeats
    .map((seat) => {
      if (typeof seat === "string") {
        const trimmedSeat = seat.trim();

        if (/^\d+$/.test(trimmedSeat)) {
          return Number(trimmedSeat);
        }

        return uuidPattern.test(trimmedSeat) ? trimmedSeat : null;
      }

      if (typeof seat === "number" && Number.isInteger(seat)) {
        return seat;
      }

      return null;
    })
    .filter((seat) => seat !== null && seat !== "");

  return normalizedSeats.length === nominatedSeats.length
    ? normalizedSeats
    : null;
}

function getAvalonNominationRequestError(
  gameId,
  questId,
  normalizedNominatedSeats,
  userId,
) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof questId !== "string" ||
    questId.length === 0 ||
    !normalizedNominatedSeats
  ) {
    return {
      ok: false,
      message: "شناسه بازی، ماموریت یا صندلی‌های انتخابی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای انتخاب تیم باید وارد حساب شوید",
    };
  }

  return null;
}

function hasDuplicateAvalonNominationSeats(normalizedNominatedSeats) {
  const duplicateCheck = new Set(
    normalizedNominatedSeats.map((seat) => String(seat)),
  );

  return duplicateCheck.size !== normalizedNominatedSeats.length;
}

async function getAvalonQuestForTeammateNomination(
  client,
  gameId,
  questId,
  userId,
) {
  const questResult = await client.query(
    `
      SELECT
        quest.id,
        quest.king_seat_id AS "kingSeatId",
        king_seat.number AS "kingSeatNumber",
        count(team_member.id)::integer AS "teamSlotCount"
      FROM avalon_quests quest
      INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
      INNER JOIN avalon_games game ON game.id = phase.game_id
      INNER JOIN avalon_seats king_seat ON king_seat.id = quest.king_seat_id
      INNER JOIN avalon_quest_team_members team_member
        ON team_member.quest_id = quest.id
      WHERE
        quest.id = $2
        AND phase.game_id = $1
        AND phase.ended_at IS NULL
        AND game.status = 'inProgress'
        AND king_seat.player_id = $3
        AND king_seat.action_required_type = 'avalon.nominateTeammates'
        AND king_seat.action_required_id = quest.id
      GROUP BY quest.id, king_seat.id
    `,
    [gameId, questId, userId],
  );

  return questResult.rows[0];
}

async function getAvalonNominatedSeatRows(
  client,
  gameId,
  normalizedNominatedSeats,
) {
  const nominatedSeatIds = normalizedNominatedSeats.filter(
    (seat) => typeof seat === "string",
  );
  const nominatedSeatNumbers = normalizedNominatedSeats.filter(
    (seat) => typeof seat === "number",
  );
  const nominatedSeatResult = await client.query(
    `
      SELECT id, number
      FROM avalon_seats
      WHERE
        game_id = $1
        AND player_id IS NOT NULL
        AND (
          id = ANY($2::uuid[])
          OR number = ANY($3::integer[])
        )
      ORDER BY number
    `,
    [gameId, nominatedSeatIds, nominatedSeatNumbers],
  );

  return nominatedSeatResult.rows;
}

async function updateAvalonQuestTeamNominations(
  client,
  questId,
  nominatedSeatRows,
) {
  await client.query(
    `
      WITH ranked_slots AS (
        SELECT
          id,
          row_number() OVER (ORDER BY id) AS slot_index
        FROM avalon_quest_team_members
        WHERE quest_id = $1
      ),
      nominated_seats AS (
        SELECT *
        FROM unnest($2::uuid[]) WITH ORDINALITY AS nominated(seat_id, slot_index)
      )
      UPDATE avalon_quest_team_members team_member
      SET seat_id = nominated_seats.seat_id
      FROM ranked_slots
      INNER JOIN nominated_seats
        ON nominated_seats.slot_index = ranked_slots.slot_index
      WHERE team_member.id = ranked_slots.id
    `,
    [
      questId,
      nominatedSeatRows.map((seat) => seat.id),
    ],
  );
}

async function openAvalonQuestDecisionForNominatedTeam(
  client,
  gameId,
  questId,
  nominatedSeatRows,
) {
  await createAvalonPublicMessage(
    client,
    gameId,
    `تیم پیشنهادی: ${formatAvalonSeatList(nominatedSeatRows)}.`,
  );

  await client.query(
    `
      UPDATE avalon_seats
      SET
        action_required_type = NULL,
        action_required_id = NULL
      WHERE game_id = $1
    `,
    [gameId],
  );
  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = 'برای تأیید یا رد تیم پیشنهادی رأی بدهید.',
        action_required_type = 'avalon.questDecision',
        action_required_id = $2
      WHERE
        game_id = $1
        AND player_id IS NOT NULL
    `,
    [gameId, questId],
  );
}

async function createInitialAvalonNightChecks(client, gameId, nightID) {
  await client.query(
    `
      WITH created_checks AS (
        INSERT INTO avalon_night_checks (night_id, seat_id)
        SELECT $2, seat.id
        FROM avalon_seats seat
        WHERE
          seat.game_id = $1
          AND seat.player_id IS NOT NULL
        RETURNING id, seat_id
      )
      UPDATE avalon_seats seat
      SET
        action_required_type = 'avalon.nightCheck',
        action_required_id = created_checks.id
      FROM created_checks
      WHERE seat.id = created_checks.seat_id
    `,
    [gameId, nightID],
  );
}

async function updateNightPrivateMessages(client, gameId) {
  const gameResult = await client.query(
    `
      SELECT role_exposing AS "roleExposing"
      FROM avalon_games
      WHERE id = $1
    `,
    [gameId],
  );
  const game = gameResult.rows[0];

  if (!game) {
    throw new Error("Expected Avalon game");
  }

  const seatsResult = await client.query(
    `
      SELECT id, role, number
      FROM avalon_seats
      WHERE
        game_id = $1
        AND player_id IS NOT NULL
      ORDER BY number
    `,
    [gameId],
  );

  for (const seat of seatsResult.rows) {
    await createAvalonPrivateMessage(
      client,
      seat.id,
      buildAvalonNightPrivateMessage(seat, seatsResult.rows, game.roleExposing),
    );
  }
}

async function createQuestPhase(client, gameId) {
  const progressSummary = await getAvalonGameProgressSummary(client, gameId);
  const gameResult = await client.query(
    `
      SELECT player_count AS "playerCount"
      FROM avalon_games
      WHERE id = $1
    `,
    [gameId],
  );
  const game = gameResult.rows[0];

  if (!game) {
    throw new Error("Expected Avalon game");
  }

  const missionRule = getAvalonMissionRule(
    game.playerCount,
    progressSummary.missionPhaseCount + 1,
  );
  const kingSeatResult = await client.query(
    `
      SELECT id, number
      FROM avalon_seats
      WHERE
        game_id = $1
        AND player_id IS NOT NULL
      ORDER BY
        CASE WHEN $2::integer IS NULL THEN random() END,
        CASE
          WHEN $2::integer IS NOT NULL AND number > $2 THEN 0
          WHEN $2::integer IS NOT NULL THEN 1
        END,
        number
      LIMIT 1
    `,
    [gameId, progressSummary.lastQuestKingSeatNumber],
  );
  const kingSeat = kingSeatResult.rows[0];

  if (!kingSeat) {
    throw new Error("Expected selected Avalon king seat");
  }

  const phase = await createAvalonPhase(client, gameId);
  const quest = await createAvalonQuest(client, phase.id, kingSeat.id);
  await createAvalonQuestTeamMemberSlots(client, quest.id, missionRule.players);

  await createAvalonPublicMessage(
    client,
    gameId,
    `پادشاه انتخاب شد: صندلی ${kingSeat.number}.`,
  );
  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = CASE
          WHEN id = $2 THEN private_message
          ELSE ''
        END,
        action_required_type = NULL,
        action_required_id = NULL
      WHERE game_id = $1
    `,
    [gameId, kingSeat.id],
  );
  await client.query(
    `
      UPDATE avalon_seats
      SET
        private_message = $3,
        action_required_type = 'avalon.nominateTeammates',
        action_required_id = $2
      WHERE id = $1
    `,
    [
      kingSeat.id,
      quest.id,
      `شما پادشاه هستید. ${missionRule.players} نفر را برای ماموریت انتخاب کنید.`,
    ],
  );

  return phase;
}

async function createNightPhase(client, gameId) {
  const phase = await createAvalonPhase(client, gameId);

  const night = await createAvalonNight(client, phase.id);

  await createAvalonPublicMessage(client, gameId, "شب بازی");
  await createInitialAvalonNightChecks(client, gameId, night.id);
  await updateNightPrivateMessages(client, gameId);

  return phase;
}

async function endAvalonNightPhaseByCheckId(client, gameId, nightCheckId) {
  const phaseResult = await client.query(
    `
      UPDATE avalon_phases phase
      SET ended_at = now()
      FROM avalon_night_checks night_check
      INNER JOIN avalon_nights night ON night.id = night_check.night_id
      WHERE
        night_check.id = $2
        AND night.phase_id = phase.id
        AND phase.game_id = $1
        AND phase.ended_at IS NULL
      RETURNING phase.id
    `,
    [gameId, nightCheckId],
  );

  if (!phaseResult.rows[0]) {
    throw new Error("Expected active Avalon night phase");
  }
}

export async function nightAlreadyCheckAvalonGame(
  gameId,
  nightCheckId,
  userId,
) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof nightCheckId !== "string" ||
    nightCheckId.length === 0
  ) {
    return {
      ok: false,
      message: "شناسه بازی یا بررسی شب نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای ثبت بررسی شب باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_night_check:${gameId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const completedCheckResult = await client.query(
      `
        WITH completed_check AS (
          UPDATE avalon_night_checks night_check
          SET is_checked = true
          FROM avalon_seats seat
          INNER JOIN avalon_games game ON game.id = seat.game_id
          WHERE
            night_check.id = $2
            AND night_check.seat_id = seat.id
            AND seat.game_id = $1
            AND seat.player_id = $3
            AND seat.action_required_type = 'avalon.nightCheck'
            AND seat.action_required_id = night_check.id
            AND game.status = 'inProgress'
            AND night_check.is_checked = false
          RETURNING
            night_check.id,
            night_check.night_id,
            night_check.seat_id
        )
        UPDATE avalon_seats seat
        SET
          action_required_type = NULL,
          action_required_id = NULL,
          private_message = 'بررسی شب شما ثبت شد. منتظر بمانید تا بقیه هم بررسی کنند.'
        FROM completed_check
        WHERE seat.id = completed_check.seat_id
        RETURNING
          completed_check.id AS "nightCheckId",
          completed_check.night_id AS "nightId",
          seat.id AS "seatId"
      `,
      [gameId, nightCheckId, userId],
    );

    const completedCheck = completedCheckResult.rows[0];

    if (!completedCheck) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط بررسی شب فعال صندلی خودتان را می‌توانید ثبت کنید",
      };
    }

    const remainingChecksResult = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM avalon_night_checks night_check
          WHERE
            night_check.night_id = $1
            AND night_check.is_checked = false
        ) AS "hasRemainingChecks"
      `,
      [completedCheck.nightId],
    );
    const hasRemainingChecks =
      remainingChecksResult.rows[0]?.hasRemainingChecks ?? true;

    if (!hasRemainingChecks) {
      await createAvalonPublicMessage(
        client,
        gameId,
        "همه بازیکنان بررسی شب را انجام دادند.",
      );
      await endAvalonNightPhaseByCheckId(
        client,
        gameId,
        completedCheck.nightCheckId,
      );
      await createQuestPhase(client, gameId);
    }

    await client.query("COMMIT");

    return {
      ok: true,
      message: "بررسی شب ثبت شد",
      gameId,
      seatId: completedCheck.seatId,
      nightCheckId: completedCheck.nightCheckId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function nominateAvalonTeammates(
  gameId,
  questId,
  nominatedSeats,
  userId,
) {
  const normalizedNominatedSeats =
    normalizeAvalonNominatedSeatValues(nominatedSeats);
  const requestError = getAvalonNominationRequestError(
    gameId,
    questId,
    normalizedNominatedSeats,
    userId,
  );

  if (requestError) {
    return requestError;
  }
  
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_quest_nomination:${questId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const quest = await getAvalonQuestForTeammateNomination(
      client,
      gameId,
      questId,
      userId,
    );
    
    if (!quest) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط پادشاه همین مرحله می‌تواند تیم ماموریت را انتخاب کند",
      };
    }

    if (normalizedNominatedSeats.length !== quest.teamSlotCount) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: `برای این ماموریت باید ${quest.teamSlotCount} صندلی انتخاب شود`,
      };
    }

    if (hasDuplicateAvalonNominationSeats(normalizedNominatedSeats)) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "صندلی‌های انتخابی نباید تکراری باشند",
      };
    }

    const nominatedSeatRows = await getAvalonNominatedSeatRows(
      client,
      gameId,
      normalizedNominatedSeats,
    );

    if (nominatedSeatRows.length !== normalizedNominatedSeats.length) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "همه صندلی‌های انتخابی باید در همین بازی و دارای بازیکن باشند",
      };
    }

    await updateAvalonQuestTeamNominations(
      client,
      questId,
      nominatedSeatRows,
    );

    const progressSummary = await getAvalonGameProgressSummary(client, gameId);

    if (progressSummary.questPhaseCountUntilLastMission >= 5) {
      await endAvalonQuestPhaseByQuestId(client, gameId, questId);
      await client.query(
        `
          UPDATE avalon_seats
          SET
            action_required_type = NULL,
            action_required_id = NULL
          WHERE game_id = $1
        `,
        [gameId],
      );
      await createAvalonMissionPhase(client, questId);
    } else {
      await openAvalonQuestDecisionForNominatedTeam(
        client,
        gameId,
        questId,
        nominatedSeatRows,
      );
    }

    await client.query("COMMIT");

    return {
      ok: true,
      message: "تیم ماموریت انتخاب شد",
      gameId,
      questId,
      nominatedSeatIds: nominatedSeatRows.map((seat) => seat.id),
    };


  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function decideAvalonQuest(gameId, questId, decision, userId) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof questId !== "string" ||
    questId.length === 0 ||
    !["approve", "disapprove"].includes(decision)
  ) {
    return {
      ok: false,
      message: "شناسه بازی، ماموریت یا تصمیم نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای ثبت تصمیم باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_quest_decision:${questId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const questResult = await client.query(
      `
        SELECT
          quest.id,
          current_seat.id AS "seatId",
          current_seat.number AS "seatNumber",
          game.player_count AS "playerCount",
          (
            SELECT count(*)::integer + 1
            FROM avalon_missions mission
            INNER JOIN avalon_phases mission_phase
              ON mission_phase.id = mission.phase_id
            WHERE mission_phase.game_id = game.id
          ) AS "missionRound",
          count(team_member.id)::integer AS "teamSlotCount",
          count(team_member.seat_id)::integer AS "teamMemberCount"
        FROM avalon_quests quest
        INNER JOIN avalon_phases phase ON phase.id = quest.phase_id
        INNER JOIN avalon_games game ON game.id = phase.game_id
        INNER JOIN avalon_seats current_seat
          ON current_seat.game_id = game.id
          AND current_seat.player_id = $3
        INNER JOIN avalon_quest_team_members team_member
          ON team_member.quest_id = quest.id
        WHERE
          quest.id = $2
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
          AND game.status = 'inProgress'
          AND current_seat.action_required_type = 'avalon.questDecision'
          AND current_seat.action_required_id = quest.id
          AND NOT EXISTS (
            SELECT 1
            FROM avalon_quest_decisions existing_decision
            WHERE
              existing_decision.quest_id = quest.id
              AND existing_decision.seat_id = current_seat.id
          )
        GROUP BY quest.id, current_seat.id, game.id
      `,
      [gameId, questId, userId],
    );
    const quest = questResult.rows[0];

    if (!quest) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط بازیکنی که هنوز برای همین ماموریت تصمیم نگرفته می‌تواند تصمیم ثبت کند",
      };
    }

    if (quest.teamMemberCount !== quest.teamSlotCount) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "ابتدا باید تیم ماموریت کامل انتخاب شود",
      };
    }

    const insertedDecisionResult = await client.query(
      `
        INSERT INTO avalon_quest_decisions (quest_id, seat_id, decision)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [questId, quest.seatId, decision],
    );
    const insertedDecision = insertedDecisionResult.rows[0];

    if (!insertedDecision) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "تصمیم ثبت نشد",
      };
    }

    await client.query(
      `
        UPDATE avalon_seats
        SET
          action_required_type = NULL,
          action_required_id = NULL,
          private_message = ''
        WHERE id = $1
      `,
      [quest.seatId],
    );

    const decisionSummaryResult = await client.query(
      `
        SELECT
          count(*)::integer AS "decisionCount",
          (count(*) FILTER (WHERE decision = 'approve'))::integer AS "approveCount",
          (count(*) FILTER (WHERE decision = 'disapprove'))::integer AS "disapproveCount"
        FROM avalon_quest_decisions
        WHERE quest_id = $1
      `,
      [questId],
    );
    const decisionSummary = decisionSummaryResult.rows[0];
    const isDecisionClosed =
      decisionSummary.decisionCount >= quest.playerCount;
    const finalResult =
      decisionSummary.approveCount > decisionSummary.disapproveCount
        ? "approved"
        : "disapproved";

    if (isDecisionClosed) {
      await endAvalonQuestPhaseByQuestId(client, gameId, questId);

      if (decisionSummary.approveCount > decisionSummary.disapproveCount) {
        await createAvalonMissionPhase(client, questId);
      } else {
        await createQuestPhase(client, gameId);
      }

      await client.query(
        `
          UPDATE avalon_seats
          SET
            action_required_type = NULL,
            action_required_id = NULL
          WHERE
            game_id = $1
            AND action_required_type = 'avalon.questDecision'
            AND action_required_id = $2
        `,
        [gameId, questId],
      );
      if (finalResult === "disapproved") {
        await createAvalonPublicMessage(
          client,
          gameId,
          `تصمیم‌گیری بسته شد. نتیجه نهایی: ${AVALON_DECISION_RESULT_LABELS[finalResult]}. تأیید: ${decisionSummary.approveCount}، رد: ${decisionSummary.disapproveCount}.`,
        );
      }
    }

    await client.query("COMMIT");

    return {
      ok: true,
      message: isDecisionClosed
        ? "تصمیم‌گیری ماموریت بسته شد"
        : "تصمیم شما ثبت شد",
      gameId,
      questId,
      seatId: quest.seatId,
      decision,
      decisionCount: decisionSummary.decisionCount,
      approveCount: decisionSummary.approveCount,
      disapproveCount: decisionSummary.disapproveCount,
      finalResult: isDecisionClosed ? finalResult : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function chooseAvalonLadyTarget(
  gameId,
  ladyCheckId,
  targetSeatId,
  userId,
) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof ladyCheckId !== "string" ||
    ladyCheckId.length === 0 ||
    typeof targetSeatId !== "string" ||
    targetSeatId.length === 0
  ) {
    return {
      ok: false,
      message: "شناسه بازی، بررسی بانوی دریاچه یا هدف نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای انتخاب هدف بانوی دریاچه باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_lady_target:${ladyCheckId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const ladyCheckResult = await client.query(
      `
        SELECT
          lady_check.id,
          lady_seat.id AS "ladySeatId",
          lady_seat.number AS "ladySeatNumber",
          target_seat.id AS "targetSeatId",
          target_seat.number AS "targetSeatNumber",
          EXISTS (
            SELECT 1
            FROM avalon_lady_checks previous_lady_check
            INNER JOIN avalon_phases previous_lady_phase
              ON previous_lady_phase.id = previous_lady_check.phase_id
            WHERE
              previous_lady_phase.game_id = game.id
              AND previous_lady_check.lady_seat_id = target_seat.id
          ) AS "targetWasLady"
        FROM avalon_lady_checks lady_check
        INNER JOIN avalon_phases phase ON phase.id = lady_check.phase_id
        INNER JOIN avalon_games game ON game.id = phase.game_id
        INNER JOIN avalon_seats lady_seat
          ON lady_seat.id = lady_check.lady_seat_id
        INNER JOIN avalon_seats target_seat
          ON target_seat.id = $3
          AND target_seat.game_id = game.id
          AND target_seat.player_id IS NOT NULL
          AND target_seat.id <> lady_seat.id
        WHERE
          lady_check.id = $2
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
          AND game.status = 'inProgress'
          AND lady_seat.player_id = $4
          AND lady_seat.action_required_type = 'avalon.ladyTarget'
          AND lady_seat.action_required_id = lady_check.id
      `,
      [gameId, ladyCheckId, targetSeatId, userId],
    );
    const ladyCheck = ladyCheckResult.rows[0];

    if (!ladyCheck) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط بانوی دریاچه می‌تواند هدف معتبر انتخاب کند",
      };
    }

    if (ladyCheck.targetWasLady) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message:
          "این بازیکن قبلاً بانوی دریاچه بوده است. هدف دیگری انتخاب کنید.",
      };
    }

    await client.query(
      `
        UPDATE avalon_lady_checks
        SET target_seat_id = $2
        WHERE id = $1
      `,
      [ladyCheckId, targetSeatId],
    );

    await client.query(
      `
        UPDATE avalon_phases phase
        SET ended_at = now()
        FROM avalon_lady_checks lady_check
        WHERE
          lady_check.id = $2
          AND lady_check.phase_id = phase.id
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
      `,
      [gameId, ladyCheckId],
    );

    await client.query(
      `
        UPDATE avalon_seats
        SET
          action_required_type = NULL,
          action_required_id = NULL,
          private_message = ''
        WHERE game_id = $1
      `,
      [gameId],
    );

    await createQuestPhase(client, gameId);

    await client.query("COMMIT");

    return {
      ok: true,
      message: "هدف بانوی دریاچه انتخاب شد",
      gameId,
      ladyCheckId,
      seatId: ladyCheck.ladySeatId,
      targetSeatId: ladyCheck.targetSeatId,
      targetSeatNumber: ladyCheck.targetSeatNumber,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function chooseAvalonAssassinationTarget(
  gameId,
  assassinationId,
  targetSeatId,
  userId,
) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof assassinationId !== "string" ||
    assassinationId.length === 0 ||
    typeof targetSeatId !== "string" ||
    targetSeatId.length === 0
  ) {
    return {
      ok: false,
      message: "شناسه بازی، ترور یا هدف نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای انتخاب مرلین باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_assassination:${assassinationId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const assassinationResult = await client.query(
      `
        SELECT
          assassination.id,
          assassin_seat.id AS "assassinSeatId",
          assassin_seat.number AS "assassinSeatNumber",
          target_seat.id AS "targetSeatId",
          target_seat.number AS "targetSeatNumber",
          target_seat.role AS "targetRole"
        FROM avalon_assassinations assassination
        INNER JOIN avalon_phases phase ON phase.id = assassination.phase_id
        INNER JOIN avalon_games game ON game.id = phase.game_id
        INNER JOIN avalon_seats assassin_seat
          ON assassin_seat.game_id = game.id
          AND assassin_seat.role = 'assassin'
        INNER JOIN avalon_seats target_seat
          ON target_seat.id = $3
          AND target_seat.game_id = game.id
          AND target_seat.player_id IS NOT NULL
        WHERE
          assassination.id = $2
          AND assassination.target_seat_id IS NULL
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
          AND game.status = 'inProgress'
          AND assassin_seat.player_id = $4
          AND assassin_seat.action_required_type = 'avalon.assassinAction'
          AND assassin_seat.action_required_id = assassination.id
      `,
      [gameId, assassinationId, targetSeatId, userId],
    );
    const assassination = assassinationResult.rows[0];

    if (!assassination) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط قاتل می‌تواند هدف معتبر برای مرلین انتخاب کند",
      };
    }

    const winnerSide = assassination.targetRole === "merlin" ? "evil" : "good";
    const winMessage =
      winnerSide === "evil"
        ? "بازی تمام شد. قاتل مرلین را پیدا کرد. شر برنده شد."
        : "بازی تمام شد. قاتل مرلین را پیدا نکرد. خیر برنده شد.";

    await client.query(
      `
        UPDATE avalon_assassinations
        SET target_seat_id = $2
        WHERE id = $1
      `,
      [assassinationId, targetSeatId],
    );

    await client.query(
      `
        UPDATE avalon_phases phase
        SET ended_at = now()
        FROM avalon_assassinations assassination
        WHERE
          assassination.id = $2
          AND assassination.phase_id = phase.id
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
      `,
      [gameId, assassinationId],
    );

    await createAvalonPublicMessage(client, gameId, winMessage);

    await client.query(
      `
        UPDATE avalon_games
        SET
          status = 'completed',
          winner_side = $2,
          ended_at = now()
        WHERE
          id = $1
          AND status = 'inProgress'
      `,
      [gameId, winnerSide],
    );

    await client.query(
      `
        UPDATE avalon_phases
        SET ended_at = now()
        WHERE
          game_id = $1
          AND ended_at IS NULL
      `,
      [gameId],
    );

    await client.query(
      `
        UPDATE avalon_seats
        SET
          action_required_type = NULL,
          action_required_id = NULL,
          private_message = $2
        WHERE game_id = $1
      `,
      [gameId, winMessage],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      message: winMessage,
      gameId,
      assassinationId,
      seatId: assassination.assassinSeatId,
      targetSeatId: assassination.targetSeatId,
      targetSeatNumber: assassination.targetSeatNumber,
      winnerSide,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function voteAvalonMission(gameId, missionId, vote, userId) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof missionId !== "string" ||
    missionId.length === 0 ||
    !["success", "fail"].includes(vote)
  ) {
    return {
      ok: false,
      message: "شناسه بازی، ماموریت یا رأی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای رأی دادن به ماموریت باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_mission_vote:${missionId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const missionResult = await client.query(
      `
        SELECT
          mission.id,
          current_seat.id AS "seatId",
          game.player_count AS "playerCount",
          count(team_member.seat_id)::integer AS "teamMemberCount",
          (
            SELECT count(*)::integer
            FROM avalon_missions round_mission
            INNER JOIN avalon_phases round_phase
              ON round_phase.id = round_mission.phase_id
            WHERE
              round_phase.game_id = game.id
              AND round_phase.created_at <= phase.created_at
          ) AS "missionRound"
        FROM avalon_missions mission
        INNER JOIN avalon_phases phase ON phase.id = mission.phase_id
        INNER JOIN avalon_games game ON game.id = phase.game_id
        INNER JOIN avalon_seats current_seat
          ON current_seat.game_id = game.id
          AND current_seat.player_id = $3
        INNER JOIN avalon_quest_team_members team_member
          ON team_member.quest_id = mission.quest_id
        WHERE
          mission.id = $2
          AND phase.game_id = $1
          AND phase.ended_at IS NULL
          AND game.status = 'inProgress'
          AND current_seat.action_required_type = 'avalon.missionVote'
          AND current_seat.action_required_id = mission.id
          AND EXISTS (
            SELECT 1
            FROM avalon_quest_team_members current_team_member
            WHERE
              current_team_member.quest_id = mission.quest_id
              AND current_team_member.seat_id = current_seat.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM avalon_mission_votes existing_vote
            WHERE
              existing_vote.mission_id = mission.id
              AND existing_vote.seat_id = current_seat.id
          )
        GROUP BY mission.id, current_seat.id, game.id, phase.id
      `,
      [gameId, missionId, userId],
    );
    const mission = missionResult.rows[0];

    if (!mission) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط اعضای تیم ماموریت که هنوز رأی نداده‌اند می‌توانند رأی بدهند",
      };
    }

    const insertedVoteResult = await client.query(
      `
        INSERT INTO avalon_mission_votes (mission_id, seat_id, vote)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [missionId, mission.seatId, vote],
    );
    const insertedVote = insertedVoteResult.rows[0];

    if (!insertedVote) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "رأی ماموریت ذخیره نشد",
      };
    }

    await client.query(
      `
        UPDATE avalon_seats
        SET
          action_required_type = NULL,
          action_required_id = NULL,
          private_message = ''
        WHERE id = $1
      `,
      [mission.seatId],
    );

    const voteSummaryResult = await client.query(
      `
        SELECT
          count(*)::integer AS "voteCount",
          (count(*) FILTER (WHERE vote = 'success'))::integer AS "successCount",
          (count(*) FILTER (WHERE vote = 'fail'))::integer AS "failCount"
        FROM avalon_mission_votes
        WHERE mission_id = $1
      `,
      [missionId],
    );
    const voteSummary = voteSummaryResult.rows[0];
    const isVoteClosed = voteSummary.voteCount >= mission.teamMemberCount;
    const missionRule = getAvalonMissionRule(
      mission.playerCount,
      mission.missionRound,
    );
    const finalResult =
      voteSummary.failCount >= missionRule.minimumFailures ? "failed" : "succeeded";

    if (isVoteClosed) {
      await createAvalonPublicMessage(
        client,
        gameId,
        `رأی‌گیری ماموریت کامل شد. نتیجه: ${AVALON_MISSION_RESULT_LABELS[finalResult]}. موفق: ${voteSummary.successCount}، شکست: ${voteSummary.failCount}.`,
      );

      await client.query(
        `
          UPDATE avalon_phases phase
          SET ended_at = now()
          FROM avalon_missions mission
          WHERE
            mission.id = $2
            AND mission.phase_id = phase.id
            AND phase.game_id = $1
            AND phase.ended_at IS NULL
        `,
        [gameId, missionId],
      );

      const progressSummary = await getAvalonGameProgressSummary(client, gameId);

      if (progressSummary.successfulMissionCount == 3) {
        await createAvalonAssassinationPhase(client, gameId);
        await client.query("COMMIT");

        return {
          ok: true,
          message: "رأی‌گیری ماموریت کامل شد",
          gameId,
          missionId,
          seatId: mission.seatId,
          vote,
          voteCount: voteSummary.voteCount,
          successCount: voteSummary.successCount,
          failCount: voteSummary.failCount,
          finalResult,
        };
      }
      if (progressSummary.failedMissionCount == 3) {
        await createAvalonPublicMessage(
          client,
          gameId,
          "بازی تمام شد. شر برنده شد.",
        );
        await client.query(
          `
            UPDATE avalon_games
            SET
              status = 'completed',
              winner_side = 'evil',
              ended_at = now()
            WHERE
              id = $1
              AND status = 'inProgress'
          `,
          [gameId],
        );
        await client.query(
          `
            UPDATE avalon_phases
            SET ended_at = now()
            WHERE
              game_id = $1
              AND ended_at IS NULL
          `,
          [gameId],
        );
        await client.query(
          `
            UPDATE avalon_seats
            SET
              action_required_type = NULL,
              action_required_id = NULL,
              private_message = 'بازی تمام شد. شر برنده شد.'
            WHERE game_id = $1
          `,
          [gameId],
        );
        await client.query("COMMIT");

        return {
          ok: true,
          message: "رأی‌گیری ماموریت کامل شد",
          gameId,
          missionId,
          seatId: mission.seatId,
          vote,
          voteCount: voteSummary.voteCount,
          successCount: voteSummary.successCount,
          failCount: voteSummary.failCount,
          finalResult,
        };
      }

      if (
        progressSummary.failedMissionCount < 3 &&
        progressSummary.successfulMissionCount < 3
      ) {
        const ladyPhaseResult = await createAvalonLadyOfTheLakePhaseWithClient(
          client,
          gameId,
        );

        if (ladyPhaseResult.ok) {
          await client.query("COMMIT");

          return {
            ok: true,
            message: "رأی‌گیری ماموریت کامل شد",
            gameId,
            missionId,
            seatId: mission.seatId,
            vote,
            voteCount: voteSummary.voteCount,
            successCount: voteSummary.successCount,
            failCount: voteSummary.failCount,
            finalResult,
          };
        }

        await createQuestPhase(client, gameId);
      }
    }

    await client.query("COMMIT");

    return {
      ok: true,
      message: isVoteClosed
        ? "رأی‌گیری ماموریت کامل شد"
        : "رأی ماموریت ذخیره شد",
      gameId,
      missionId,
      seatId: mission.seatId,
      vote,
      voteCount: voteSummary.voteCount,
      successCount: voteSummary.successCount,
      failCount: voteSummary.failCount,
      finalResult: isVoteClosed ? finalResult : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelAvalonGame(gameId, userId) {
  if (typeof gameId !== "string" || gameId.length === 0) {
    return {
      ok: false,
      message: "شناسه بازی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای لغو بازی باید وارد حساب شوید",
    };
  }

  const terminalBlock = await blockTerminalAvalonGameAction(pool, gameId);

  if (terminalBlock) {
    return terminalBlock;
  }

  const result = await pool.query(
    `
      UPDATE avalon_games
      SET
        status = 'cancelled',
        ended_at = now()
      WHERE
        id = $1
        AND creator_id = $2
        AND status = 'lobby'
        AND status NOT IN ('completed', 'cancelled')
      RETURNING id
    `,
    [gameId, userId],
  );

  if (!result.rows[0]) {
    return {
      ok: false,
      message: "فقط سازنده می‌تواند بازی داخل لابی را لغو کند",
    };
  }

  return {
    ok: true,
    message: "بازی لغو شد",
    gameId: result.rows[0].id,
  };
}

export async function startAvalonGame(gameId, userId) {
  if (typeof gameId !== "string" || gameId.length === 0) {
    return {
      ok: false,
      message: "شناسه بازی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای شروع بازی باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_game_start:${gameId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const result = await client.query(
      `
        UPDATE avalon_games game
        SET
          status = 'inProgress',
          started_at = now()
        WHERE
          game.id = $1
          AND game.creator_id = $2
          AND game.status = 'lobby'
          AND game.status NOT IN ('completed', 'cancelled')
          AND (
            SELECT count(*)
            FROM avalon_seats seat
            WHERE
              seat.game_id = game.id
              AND seat.player_id IS NOT NULL
          ) = game.player_count
        RETURNING game.id, game.started_at AS "startedAt"
      `,
      [gameId, userId],
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message:
          "فقط سازنده می‌تواند بازی لابی را بعد از پر شدن همه صندلی‌ها شروع کند",
      };
    }

    await createNightPhase(client, result.rows[0].id);

    await client.query("COMMIT");

    return {
      ok: true,
      message: "بازی شروع شد",
      gameId: result.rows[0].id,
      startedAt: result.rows[0].startedAt,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function joinAvalonSeat(gameId, seatId, userId) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof seatId !== "string" ||
    seatId.length === 0
  ) {
    return {
      ok: false,
      message: "شناسه بازی یا صندلی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای نشستن باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_game_seats:${gameId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const result = await client.query(
      `
        UPDATE avalon_seats seat
        SET
          player_id = $3,
          private_message = concat('شما در صندلی شماره ', seat.number, ' نشسته اید')
        FROM avalon_games game
        WHERE
          seat.id = $2
          AND seat.game_id = $1
          AND seat.game_id = game.id
          AND game.status = 'lobby'
          AND game.status NOT IN ('completed', 'cancelled')
          AND seat.player_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM avalon_seats existing_seat
            WHERE
              existing_seat.game_id = $1
              AND existing_seat.player_id = $3
          )
        RETURNING seat.id
      `,
      [gameId, seatId, userId],
    );

    await client.query("COMMIT");

    if (!result.rows[0]) {
      return {
        ok: false,
        message: "فقط در لابی می‌توانید یک صندلی خالی بگیرید",
      };
    }

    return {
      ok: true,
      message: "روی صندلی نشستید",
      gameId,
      seatId: result.rows[0].id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeAvalonSeat(gameId, seatId, userId) {
  if (
    typeof gameId !== "string" ||
    gameId.length === 0 ||
    typeof seatId !== "string" ||
    seatId.length === 0
  ) {
    return {
      ok: false,
      message: "شناسه بازی یا صندلی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای تغییر صندلی باید وارد حساب شوید",
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_game_seats:${gameId}`,
    ]);

    const terminalBlock = await blockTerminalAvalonGameAction(client, gameId);

    if (terminalBlock) {
      await client.query("ROLLBACK");
      return terminalBlock;
    }

    const clearCurrentSeatResult = await client.query(
      `
        UPDATE avalon_seats current_seat
        SET
          player_id = NULL,
          private_message = ''
        FROM avalon_games game
        WHERE
          current_seat.game_id = $1
          AND current_seat.player_id = $3
          AND current_seat.game_id = game.id
          AND game.status = 'lobby'
          AND game.status NOT IN ('completed', 'cancelled')
          AND EXISTS (
            SELECT 1
            FROM avalon_seats target_seat
            WHERE
              target_seat.id = $2
              AND target_seat.game_id = $1
              AND target_seat.player_id IS NULL
          )
        RETURNING current_seat.id
      `,
      [gameId, seatId, userId],
    );

    if (!clearCurrentSeatResult.rows[0]) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "فقط در لابی می‌توانید به صندلی خالی جابه‌جا شوید",
      };
    }

    const targetSeatResult = await client.query(
      `
        UPDATE avalon_seats target_seat
        SET
          player_id = $3,
          private_message = concat('شما در صندلی شماره ', target_seat.number, ' نشسته اید')
        FROM avalon_games game
        WHERE
          target_seat.id = $2
          AND target_seat.game_id = $1
          AND target_seat.game_id = game.id
          AND game.status = 'lobby'
          AND game.status NOT IN ('completed', 'cancelled')
          AND target_seat.player_id IS NULL
        RETURNING target_seat.id
      `,
      [gameId, seatId, userId],
    );

    if (!targetSeatResult.rows[0]) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        message: "صندلی مقصد دیگر خالی نیست",
      };
    }

    await client.query("COMMIT");

    return {
      ok: true,
      message: "صندلی شما تغییر کرد",
      gameId,
      seatId: targetSeatResult.rows[0].id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function leaveAvalonSeat(gameId, userId) {
  if (typeof gameId !== "string" || gameId.length === 0) {
    return {
      ok: false,
      message: "شناسه بازی نامعتبر است",
    };
  }

  if (!userId) {
    return {
      ok: false,
      message: "برای ترک صندلی باید وارد حساب شوید",
    };
  }

  const terminalBlock = await blockTerminalAvalonGameAction(pool, gameId);

  if (terminalBlock) {
    return terminalBlock;
  }

  const result = await pool.query(
    `
      UPDATE avalon_seats seat
      SET
        player_id = NULL,
        private_message = ''
      FROM avalon_games game
      WHERE
        seat.game_id = $1
        AND seat.player_id = $2
        AND seat.game_id = game.id
        AND game.status = 'lobby'
        AND game.status NOT IN ('completed', 'cancelled')
      RETURNING seat.id
    `,
    [gameId, userId],
  );

  if (!result.rows[0]) {
    return {
      ok: false,
      message: "فقط صندلی خودتان را در لابی می‌توانید ترک کنید",
    };
  }

  return {
    ok: true,
    message: "صندلی را ترک کردید",
    gameId,
    seatId: result.rows[0].id,
  };
}
