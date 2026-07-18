import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { QueryResultRow } from "pg";

import { apiResponse, badRequest, serverError, unauthorized } from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import type {
  AvalonGame,
  AvalonGameConfig,
  AvalonGameStatus,
  AvalonRoleName,
  AvalonSeat,
  AvalonSeatActionRequired,
  AvalonSide,
} from "@/types/avalon";
import type { ApiUser } from "@/types/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreateAvalonGameRequestBody = {
  name?: unknown;
  config?: unknown;
};

type AvalonGameRow = {
  id: string;
  name: string;
  status: AvalonGameStatus;
  playerCount: AvalonGameConfig["playerCount"];
  useOberon: boolean;
  useLadyOfTheLake: boolean;
  roleExposing: boolean;
  publicMessage: string;
  winnerSide: AvalonSide | null;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
};

type AvalonSeatRow = {
  id: string;
  role: AvalonRoleName;
  number: number;
  privateMessage: string | null;
  actionRequiredType: AvalonSeatActionRequired["type"] | null;
  actionRequiredId: string | null;
};

type ActiveAvalonGameRow = {
  id: string;
};

type CreatedAvalonGameResponse = Omit<AvalonGame, "creator"> & {
  creator: ApiUser;
};

const avalonPlayerCounts = [6, 7, 8, 9, 10] as const;
const initialPublicMessage = "بازی در مرحله لابی است.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAvalonPlayerCount(
  value: unknown,
): value is AvalonGameConfig["playerCount"] {
  return (
    typeof value === "number" &&
    avalonPlayerCounts.includes(value as AvalonGameConfig["playerCount"])
  );
}

function parseAvalonGameConfig(value: unknown): AvalonGameConfig | string {
  if (!isRecord(value)) {
    return "تنظیمات بازی الزامی است";
  }

  if (!isAvalonPlayerCount(value.playerCount)) {
    return "تعداد بازیکنان نامعتبر است";
  }

  if (
    typeof value.useOberon !== "boolean" ||
    typeof value.useLadyOfTheLake !== "boolean" ||
    typeof value.roleExposing !== "boolean"
  ) {
    return "تنظیمات بازی نامعتبر است";
  }

  if (value.useOberon && value.playerCount < 8) {
    return "اوبرون فقط برای بازی‌های ۸ نفره به بالا قابل انتخاب است";
  }

  return {
    playerCount: value.playerCount,
    useOberon: value.useOberon,
    useLadyOfTheLake: value.useLadyOfTheLake,
    roleExposing: value.roleExposing,
  };
}

function shuffleRoles(roles: AvalonRoleName[]) {
  const shuffled = [...roles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createRoles(config: AvalonGameConfig): AvalonRoleName[] {
  const evilRoles: AvalonRoleName[] = [
    "assassin",
    "morgana",
    "mordred",
    ...(config.playerCount >= 8 && config.useOberon
      ? (["oberon"] satisfies AvalonRoleName[])
      : []),
  ];
  const goodRoleCount = config.playerCount - evilRoles.length;
  const servantCount = Math.max(goodRoleCount - 2, 0);
  const goodRoles: AvalonRoleName[] = [
    "merlin",
    "percival",
    ...Array<AvalonRoleName>(servantCount).fill("servant"),
  ];

  return shuffleRoles([...goodRoles, ...evilRoles]);
}

function mapGame(row: AvalonGameRow, seats: AvalonSeat[]): Omit<AvalonGame, "creator"> {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    config: {
      playerCount: row.playerCount,
      useOberon: row.useOberon,
      useLadyOfTheLake: row.useLadyOfTheLake,
      roleExposing: row.roleExposing,
    },
    seats,
    publicMessage: row.publicMessage,
    winnerSide: row.winnerSide,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    phases: [],
  };
}

function assertSingleRow<T extends QueryResultRow>(row: T | undefined) {
  if (!row) {
    throw new Error("Expected created row");
  }

  return row;
}

async function ensureAvalonMessageColumns(
  queryable: Pick<ReturnType<typeof getPostgresPool>, "query">,
) {
  await queryable.query(`
    ALTER TABLE avalon_games
    ADD COLUMN IF NOT EXISTS table_name text
  `);
  await queryable.query(`
    ALTER TABLE avalon_games
    ADD COLUMN IF NOT EXISTS public_message text NOT NULL DEFAULT 'بازی در مرحله لابی است.'
  `);
  await queryable.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS private_message text
  `);
  await queryable.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS action_required_type text
  `);
  await queryable.query(`
    ALTER TABLE avalon_seats
    ADD COLUMN IF NOT EXISTS action_required_id uuid
  `);
}

export async function POST(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unauthorized("کاربر پیدا نشد");
  }

  let body: CreateAvalonGameRequestBody;

  try {
    body = (await request.json()) as CreateAvalonGameRequestBody;
  } catch {
    return badRequest("بدنه درخواست نامعتبر است");
  }

  const config = parseAvalonGameConfig(body.config);

  if (typeof config === "string") {
    return badRequest(config);
  }

  if (body.name !== undefined && typeof body.name !== "string") {
    return badRequest("نام میز نامعتبر است");
  }

  const tableName = typeof body.name === "string" ? body.name.trim() : "";

  if (tableName.length > 60) {
    return badRequest("نام میز نمی‌تواند بیشتر از ۶۰ نویسه باشد");
  }

  const roles = createRoles(config);
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await ensureAvalonMessageColumns(client);
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `avalon_game_creator:${session.user.id}`,
    ]);

    const activeGameResult = await client.query<ActiveAvalonGameRow>(
      `
        SELECT id
        FROM avalon_games
        WHERE
          creator_id = $1
          AND status NOT IN ('completed', 'cancelled')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [session.user.id],
    );

    if (activeGameResult.rows[0]) {
      await client.query("ROLLBACK");

      return badRequest("شما یک بازی آوالون فعال دارید");
    }

    const gameResult = await client.query<AvalonGameRow>(
      `
        INSERT INTO avalon_games (
          creator_id,
          table_name,
          player_count,
          use_oberon,
          use_lady_of_the_lake,
          role_exposing,
          public_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          COALESCE(table_name, 'میز بدون نام') AS name,
          status,
          player_count AS "playerCount",
          use_oberon AS "useOberon",
          use_lady_of_the_lake AS "useLadyOfTheLake",
          role_exposing AS "roleExposing",
          public_message AS "publicMessage",
          winner_side AS "winnerSide",
          created_at AS "createdAt",
          started_at AS "startedAt",
          ended_at AS "endedAt"
      `,
      [
        session.user.id,
        tableName || null,
        config.playerCount,
        config.useOberon,
        config.useLadyOfTheLake,
        config.roleExposing,
        initialPublicMessage,
      ],
    );
    const game = assertSingleRow(gameResult.rows[0]);

    const seatResult = await client.query<AvalonSeatRow>(
      `
        INSERT INTO avalon_seats (game_id, role, number)
        SELECT $1, role, number
        FROM unnest($2::text[], $3::integer[]) AS seat(role, number)
        RETURNING
          id,
          role,
          number,
          private_message AS "privateMessage",
          action_required_type AS "actionRequiredType",
          action_required_id AS "actionRequiredId"
      `,
      [game.id, roles, roles.map((_, index) => index + 1)],
    );

    await client.query("COMMIT");

    const seats = seatResult.rows
      .map((seat) => ({
        id: seat.id,
        role: seat.role,
        number: seat.number,
        privateMessage: seat.privateMessage,
        actionRequired:
          seat.actionRequiredType && seat.actionRequiredId
            ? {
                type: seat.actionRequiredType,
                id: seat.actionRequiredId,
              }
            : null,
        player: null,
      }))
      .sort((leftSeat, rightSeat) => leftSeat.number - rightSeat.number);
    const data: CreatedAvalonGameResponse = {
      ...mapGame(game, seats),
      creator: session.user,
    };

    return apiResponse(201, "بازی آوالون ساخته شد", data, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create Avalon game", error);

    return serverError("ساخت بازی آوالون انجام نشد");
  } finally {
    client.release();
  }
}
