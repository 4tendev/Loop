export const terminalAvalonGameStatuses = new Set([
  "completed",
  "cancelled",
  "canceled",
]);

export function isTerminalAvalonGameStatus(status) {
  return terminalAvalonGameStatuses.has(status);
}

export function createTerminalAvalonGameResult() {
  return {
    ok: false,
    message: "این بازی تمام شده یا لغو شده است",
  };
}

export async function blockTerminalAvalonGameAction(queryable, gameId) {
  const result = await queryable.query(
    `
      SELECT status
      FROM avalon_games
      WHERE id = $1
    `,
    [gameId],
  );
  const game = result.rows[0];

  if (!game) {
    return null;
  }

  return isTerminalAvalonGameStatus(game.status)
    ? createTerminalAvalonGameResult()
    : null;
}
