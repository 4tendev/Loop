"use client";

import { useUser } from "@/app/providers/UserProvider";

import { AvalonTableCard } from "./AvalonTableCard";
import { AvalonTablesHeader } from "./AvalonTablesHeader";
import { useAvalonTables } from "./useAvalonTables";

type AvalonTablesClientProps = {
  tableId?: string;
};

export default function AvalonTablesClient({ tableId }: AvalonTablesClientProps) {
  const { user, isCheckingUser } = useUser();
  const isTableView = Boolean(tableId);
  const {
    games,
    tableSnapshot,
    isTableSnapshotLoaded,
    wsUser,
    connectionStatus,
    error,
    notice,
    cancellingGameId,
    startingGameId,
    selectedSeatByGame,
    selectedTeamSeatsByQuest,
    selectedLadyTargetByCheck,
    selectedAssassinTargetByAssassination,
    pendingSeatGameId,
    pendingNominationQuestId,
    pendingDecisionQuestId,
    pendingMissionVoteId,
    pendingLadyTargetId,
    pendingAssassinActionId,
    actions,
  } = useAvalonTables(tableId);
  const currentUserId = wsUser?.id ?? user?.id ?? null;
  const tableGameStatus = tableSnapshot?.tableInfo?.status ?? null;
  const isTerminalTableGame =
    tableGameStatus === "completed" || tableGameStatus === "cancelled";
  const tableActionRequired = isTerminalTableGame
    ? null
    : (tableSnapshot?.actionRequired ?? null);
  const displayedGames = isTableView
    ? isTableSnapshotLoaded && tableSnapshot?.tableInfo
      ? [tableSnapshot.tableInfo]
      : []
    : games;
  const isLoading = isTableView
    ? !isTableSnapshotLoaded
    : connectionStatus === "connecting" || connectionStatus === "syncing";
  const hasActiveCreatedGame =
    currentUserId !== null &&
    games.some(
      (game) =>
        game.creator.id === currentUserId &&
        game.status !== "completed" &&
        game.status !== "cancelled",
    );
  const canCreateGame =
    !isTableView &&
    !isCheckingUser &&
    connectionStatus === "connected" &&
    currentUserId !== null &&
    !hasActiveCreatedGame;

  return (
    <main
      className={
        isTableView
          ? "h-full overflow-hidden bg-base-200 text-base-content sm:px-6 sm:py-6 lg:px-8"
          : "min-h-full bg-base-200 px-4 py-8 text-base-content sm:px-6 lg:px-8"
      }
      dir="rtl"
    >
      <div
        className={`mx-auto grid w-full ${
          isTableView ? "h-full max-w-5xl overflow-hidden" : "max-w-4xl gap-6"
        }`}
      >
        <section
          className={
            isTableView
              ? "relative h-full min-h-0 overflow-hidden bg-base-200 shadow-sm sm:rounded-lg sm:border sm:border-base-300 sm:bg-base-100"
              : "rounded-lg border border-base-300 bg-base-100 shadow-sm"
          }
        >
          {!isTableView ? (
            <AvalonTablesHeader
              canCreateGame={canCreateGame}
              connectionStatus={connectionStatus}
              tableId={tableId}
            />
          ) : null}

          <div
            className={isTableView ? "h-full min-h-0 overflow-hidden" : "p-5"}
          >
            {error ? (
              <div
                className={
                  isTableView
                    ? "absolute left-3 right-3 top-3 z-50 rounded-md bg-error px-3 py-2 text-sm text-error-content"
                    : "alert alert-error mb-5 text-sm"
                }
              >
                <span>{error}</span>
              </div>
            ) : null}

            {notice && !error ? (
              <div
                className={
                  isTableView
                    ? "absolute left-3 right-3 top-3 z-50 rounded-md bg-success px-3 py-2 text-sm text-success-content"
                    : "alert alert-success mb-5 text-sm"
                }
              >
                <span>{notice}</span>
              </div>
            ) : null}

            {isLoading && displayedGames.length === 0 ? (
              <div
                className={
                  isTableView
                    ? "flex h-full items-center justify-center bg-base-200 text-base-content"
                    : "flex min-h-48 items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-200"
                }
              >
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : null}

            {!isLoading && displayedGames.length === 0 ? (
              <div
                className={
                  isTableView
                    ? "flex h-full items-center justify-center bg-base-200 px-4 text-center text-sm text-base-content/70"
                    : "flex min-h-48 items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-200 px-4 text-center text-sm text-base-content/60"
                }
              >
                {tableId
                  ? "این میز فعال نیست یا پیدا نشد."
                  : "فعلا هیچ بازی فعال آوالونی وجود ندارد."}
              </div>
            ) : null}

            {displayedGames.length > 0 ? (
              <div className={isTableView ? "h-full min-h-0" : "grid gap-3"}>
                {displayedGames.map((game) => (
                  <AvalonTableCard
                    actionRequired={
                      tableSnapshot?.gameId === game.id
                        ? tableActionRequired
                        : null
                    }
                    cancellingGameId={cancellingGameId}
                    connectionStatus={connectionStatus}
                    game={game}
                    key={game.id}
                    onCancelGame={actions.cancelGame}
                    onChangeSeat={actions.changeSeat}
                    onJoinSeat={actions.joinSeat}
                    onLeaveSeat={actions.leaveSeat}
                    onNightAlreadyCheck={actions.nightAlreadyCheck}
                    onDecideQuest={actions.decideQuest}
                    onVoteMission={actions.voteMission}
                    onChooseAssassinTarget={actions.chooseAssassinTarget}
                    onChooseLadyTarget={actions.chooseLadyTarget}
                    onNominateTeammates={actions.nominateTeammates}
                    onSelectAssassinTarget={actions.selectAssassinTarget}
                    onSelectLadyTarget={actions.selectLadyTarget}
                    onSelectSeat={actions.selectSeat}
                    onStartGame={actions.startGame}
                    onToggleTeamSeat={actions.toggleTeamSeat}
                    pendingAssassinActionId={pendingAssassinActionId}
                    pendingDecisionQuestId={pendingDecisionQuestId}
                    pendingMissionVoteId={pendingMissionVoteId}
                    pendingLadyTargetId={pendingLadyTargetId}
                    pendingNominationQuestId={pendingNominationQuestId}
                    pendingSeatGameId={pendingSeatGameId}
                    privateMessage={tableSnapshot?.privateMessage ?? null}
                    selectedSeatId={selectedSeatByGame[game.id] ?? null}
                    selectedTeamSeatIds={
                      tableSnapshot?.gameId === game.id &&
                      tableActionRequired?.type === "avalon.nominateTeammates"
                        ? (selectedTeamSeatsByQuest[
                            tableActionRequired.id
                          ] ?? [])
                        : []
                    }
                    selectedAssassinTargetSeatId={
                      tableSnapshot?.gameId === game.id &&
                      tableActionRequired?.type === "avalon.assassinAction"
                        ? (selectedAssassinTargetByAssassination[
                            tableActionRequired.id
                          ] ?? null)
                        : null
                    }
                    selectedLadyTargetSeatId={
                      tableSnapshot?.gameId === game.id &&
                      tableActionRequired?.type === "avalon.ladyTarget"
                        ? (selectedLadyTargetByCheck[
                            tableActionRequired.id
                          ] ?? null)
                        : null
                    }
                    startingGameId={startingGameId}
                    tableId={tableId}
                    userId={user?.id ?? null}
                    wsUserId={wsUser?.id ?? null}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
