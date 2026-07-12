import Link from "next/link";
import { useMemo } from "react";
import type { CSSProperties } from "react";

import {
  avalonMissionRulesByPlayerCount,
  type AvalonMissionVoteValue,
  type AvalonQuestDecisionValue,
  type AvalonSeatActionRequired,
} from "@/types/avalon";
import { formatTime, statusClasses, statusLabels } from "./avalonTableUtils";
import type { AvalonWsGame, AvalonWsSeat, ConnectionStatus } from "./types";

type AvalonTableCardProps = {
  game: AvalonWsGame;
  tableId?: string;
  userId: string | null;
  wsUserId: string | null;
  connectionStatus: ConnectionStatus;
  selectedSeatId: string | null;
  cancellingGameId: string | null;
  startingGameId: string | null;
  pendingSeatGameId: string | null;
  pendingNominationQuestId: string | null;
  pendingDecisionQuestId: string | null;
  pendingMissionVoteId: string | null;
  pendingLadyTargetId: string | null;
  pendingAssassinActionId: string | null;
  actionRequired: AvalonSeatActionRequired | null;
  privateMessage?: string | null;
  selectedTeamSeatIds: string[];
  selectedLadyTargetSeatId: string | null;
  selectedAssassinTargetSeatId: string | null;
  onCancelGame: (gameId: string) => void;
  onStartGame: (gameId: string) => void;
  onSelectSeat: (game: AvalonWsGame, seat: AvalonWsSeat) => void;
  onToggleTeamSeat: (
    questId: string,
    seatId: string,
    teamSlotCount: number,
  ) => void;
  onSelectLadyTarget: (ladyCheckId: string, seatId: string) => void;
  onSelectAssassinTarget: (assassinationId: string, seatId: string) => void;
  onJoinSeat: (gameId: string) => void;
  onChangeSeat: (gameId: string) => void;
  onLeaveSeat: (gameId: string) => void;
  onNightAlreadyCheck: (gameId: string, nightCheckId: string) => void;
  onDecideQuest: (
    gameId: string,
    questId: string,
    decision: AvalonQuestDecisionValue,
  ) => void;
  onVoteMission: (
    gameId: string,
    missionVoteId: string,
    vote: AvalonMissionVoteValue,
  ) => void;
  onNominateTeammates: (
    gameId: string,
    questId: string,
    teamSlotCount: number,
  ) => void;
  onChooseLadyTarget: (gameId: string, ladyCheckId: string) => void;
  onChooseAssassinTarget: (gameId: string, assassinationId: string) => void;
};

import {
  phaseLabels,
  roleLabels,
  sideLabels,
} from "./avalonTableCardConstants";
import { AvalonTableSeat } from "./AvalonTableSeat";

export function AvalonTableCard({
  game,
  tableId,
  userId,
  wsUserId,
  connectionStatus,
  selectedSeatId,
  cancellingGameId,
  startingGameId,
  pendingSeatGameId,
  pendingNominationQuestId,
  pendingDecisionQuestId,
  pendingMissionVoteId,
  pendingLadyTargetId,
  pendingAssassinActionId,
  actionRequired,
  privateMessage,
  selectedTeamSeatIds,
  selectedLadyTargetSeatId,
  selectedAssassinTargetSeatId,
  onCancelGame,
  onStartGame,
  onSelectSeat,
  onToggleTeamSeat,
  onSelectLadyTarget,
  onSelectAssassinTarget,
  onJoinSeat,
  onChangeSeat,
  onLeaveSeat,
  onNightAlreadyCheck,
  onDecideQuest,
  onVoteMission,
  onNominateTeammates,
  onChooseLadyTarget,
  onChooseAssassinTarget,
}: AvalonTableCardProps) {
  const currentUserId = userId ?? wsUserId;
  const isTableView = Boolean(tableId);
  const ownSeat = currentUserId
    ? game.seats.find((seat) => seat.player?.id === currentUserId)
    : null;
  const selectedSeat = selectedSeatId
    ? game.seats.find((seat) => seat.id === selectedSeatId)
    : null;
  const isCreator = userId === game.creator.id || wsUserId === game.creator.id;
  const isFull = game.occupiedSeatCount === game.config.playerCount;
  const isTerminalGame =
    game.status === "completed" || game.status === "cancelled";
  const missionRules = avalonMissionRulesByPlayerCount[game.config.playerCount];
  const nominationQuest =
    actionRequired?.type === "avalon.nominateTeammates"
      ? (game.phases.find((phase) => phase.id === actionRequired.id)?.quest ??
        null)
      : null;
  const nominationQuestId =
    actionRequired?.type === "avalon.nominateTeammates"
      ? actionRequired.id
      : null;
  const teamSlotCount = nominationQuest?.teamSlotCount ?? 0;
  const isNominationMode = Boolean(nominationQuestId && teamSlotCount > 0);
  const ladyCheckId =
    actionRequired?.type === "avalon.ladyTarget" ? actionRequired.id : null;
  const isLadyTargetMode = Boolean(ladyCheckId);
  const assassinationId =
    actionRequired?.type === "avalon.assassinAction" ? actionRequired.id : null;
  const isAssassinTargetMode = Boolean(assassinationId);
  const selectedLadyTargetSeat = selectedLadyTargetSeatId
    ? game.seats.find((seat) => seat.id === selectedLadyTargetSeatId)
    : null;
  const selectedAssassinTargetSeat = selectedAssassinTargetSeatId
    ? game.seats.find((seat) => seat.id === selectedAssassinTargetSeatId)
    : null;
  const selectedTeamSeats = selectedTeamSeatIds
    .map((seatId) => game.seats.find((seat) => seat.id === seatId))
    .filter((seat): seat is AvalonWsSeat => Boolean(seat));
  const sideSeatCount = game.seats.length >= 9 ? 3 : undefined;
  const topSeatCount =
    sideSeatCount === undefined
      ? Math.ceil(game.seats.length / 4)
      : Math.ceil((game.seats.length - sideSeatCount * 2) / 2);
  const rightSeatCount =
    sideSeatCount ?? Math.ceil((game.seats.length - topSeatCount) / 3);
  const bottomSeatCount =
    sideSeatCount === undefined
      ? Math.ceil((game.seats.length - topSeatCount - rightSeatCount) / 2)
      : game.seats.length - topSeatCount - rightSeatCount - sideSeatCount;
  const topSeats = game.seats.slice(0, topSeatCount);
  const rightSeats = game.seats.slice(
    topSeatCount,
    topSeatCount + rightSeatCount,
  );
  const bottomSeats = game.seats
    .slice(
      topSeatCount + rightSeatCount,
      topSeatCount + rightSeatCount + bottomSeatCount,
    )
    .reverse();
  const leftSeats = game.seats
    .slice(topSeatCount + rightSeatCount + bottomSeatCount)
    .reverse();
  const missionPhaseResults = game.phases
    .filter((phase) => phase.mission)
    .map((phase, index) => ({
      id: phase.id,
      round: phase.mission?.missionRound ?? index + 1,
      successCount: phase.mission?.successCount ?? 0,
      failCount: phase.mission?.failCount ?? 0,
      voteCount: phase.mission?.voteCount ?? 0,
      teamMemberCount: phase.mission?.teamMemberCount ?? 0,
      result: phase.mission?.result ?? null,
    }));
  const decidingMissionRound = (() => {
    let succeededCount = 0;
    let failedCount = 0;

    for (const mission of missionPhaseResults) {
      if (mission.result === "succeeded") {
        succeededCount += 1;

        if (succeededCount === 3) {
          return mission.round;
        }
      }

      if (mission.result === "failed") {
        failedCount += 1;

        if (failedCount === 3) {
          return mission.round;
        }
      }
    }

    return null;
  })();
  const missionResultByRound = new Map(
    missionPhaseResults.map((mission) => [mission.round, mission]),
  );
  const latestPhase = game.phases.find((phase) => phase.endedAt === null);
  const latestQuest =
    game.phases
      .slice()
      .reverse()
      .find((phase) => phase.quest)?.quest ?? null;
  const lastKingSeatNumber = latestQuest?.kingSeatNumber ?? null;
  const activeQuest =
    latestPhase?.type === "quest" ? (latestPhase.quest ?? null) : null;
  const isAssassinationPhase = latestPhase?.type === "assassination";
  const activeQuestTeamSeatNumbers = new Set(
    activeQuest?.teamMemberSeatNumbers ?? [],
  );
  const latestLadyReveal =
    game.phases
      .slice()
      .reverse()
      .find((phase) => phase.ladyCheck?.targetSide)?.ladyCheck ?? null;
  const latestNightSummary =
    game.phases
      .slice()
      .reverse()
      .find((phase) => phase.night?.summary)?.night?.summary ?? null;
  const nightRevealSeats = latestNightSummary?.revealSeats ?? [];
  const missionVoteActionId =
    actionRequired?.type === "avalon.missionVote" ? actionRequired.id : null;
  const missionVoteOrder = useMemo(
    () =>
      Math.random() < 0.5
        ? (["success", "fail"] as const)
        : (["fail", "success"] as const),
    [missionVoteActionId],
  );
  const succeededMissionCount = missionPhaseResults.filter(
    (mission) => mission.result === "succeeded",
  ).length;
  const failedMissionCount = missionPhaseResults.filter(
    (mission) => mission.result === "failed",
  ).length;
  const resultTone =
    game.status === "cancelled"
      ? "border-error/30 bg-error/10 text-error"
      : game.winnerSide === "good"
        ? "border-success/30 bg-success/10 text-success"
        : "border-error/30 bg-error/10 text-error";
  const resultTitle =
    game.status === "cancelled"
      ? "Game cancelled"
      : game.winnerSide
        ? `${sideLabels[game.winnerSide]} wins`
        : "Game completed";
  const resultDetail =
    game.status === "cancelled"
      ? "This table was cancelled before the game finished."
      : `${succeededMissionCount} successful missions, ${failedMissionCount} failed missions.`;

  const seatProps = {
    game,
    ownSeatId: ownSeat?.id,
    selectedSeatId,
    selectedTeamSeatIds,
    activeQuestTeamSeatNumbers,
    selectedLadyTargetSeatId,
    selectedAssassinTargetSeatId,
    nominationQuestId,
    ladyCheckId,
    assassinationId,
    teamSlotCount,
    isTerminalGame,
    isAssassinationPhase,
    lastKingSeatNumber,
    lastKingPlayerName: latestQuest?.kingPlayerName,
    onSelectSeat,
    onToggleTeamSeat,
    onSelectLadyTarget,
    onSelectAssassinTarget,
  };

  function renderSeat(
    seat: AvalonWsSeat,
    position: "top" | "right" | "bottom" | "left",
  ) {
    return (
      <AvalonTableSeat
        {...seatProps}
        key={seat.id}
        position={position}
        seat={seat}
        variant="grid"
      />
    );
  }

  function renderCouncilSeat(seat: AvalonWsSeat) {
    return (
      <AvalonTableSeat
        {...seatProps}
        key={seat.id}
        seat={seat}
        variant="council"
      />
    );
  }

  const actionButtons = [];

  if (isTableView && isCreator && game.status === "lobby") {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-success px-2 py-2 text-xs font-bold text-success-content shadow-lg shadow-success/25 disabled:opacity-45"
        disabled={
          !isFull ||
          startingGameId === game.id ||
          connectionStatus !== "connected"
        }
        key="start"
        onClick={() => onStartGame(game.id)}
        type="button"
      >
        {startingGameId === game.id ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <span className="text-lg leading-none">▶</span>
        )}
        <span>شروع</span>
      </button>,
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border border-error/50 bg-error px-2 py-2 text-xs font-bold text-error-content disabled:opacity-45"
        disabled={
          cancellingGameId === game.id || connectionStatus !== "connected"
        }
        key="cancel"
        onClick={() => onCancelGame(game.id)}
        type="button"
      >
        {cancellingGameId === game.id ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <span className="text-lg leading-none">×</span>
        )}
        <span>لغو</span>
      </button>,
    );
  }

  if (isTableView && game.status === "lobby" && ownSeat) {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-warning px-2 py-2 text-xs font-bold text-warning-content disabled:opacity-45"
        disabled={
          !selectedSeat ||
          pendingSeatGameId === game.id ||
          connectionStatus !== "connected"
        }
        key="change-seat"
        onClick={() => onChangeSeat(game.id)}
        type="button"
      >
        <span className="text-lg leading-none">↺</span>
        <span>تغییر</span>
      </button>,
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border border-base-content/25 bg-base-100 px-2 py-2 text-xs font-bold text-base-content disabled:opacity-45"
        disabled={
          pendingSeatGameId === game.id || connectionStatus !== "connected"
        }
        key="leave-seat"
        onClick={() => onLeaveSeat(game.id)}
        type="button"
      >
        <span className="text-lg leading-none">○</span>
        <span>ترک</span>
      </button>,
    );
  }

  if (isTableView && game.status === "lobby" && !ownSeat) {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-warning px-2 py-2 text-xs font-bold text-warning-content disabled:opacity-45"
        disabled={
          !selectedSeat ||
          pendingSeatGameId === game.id ||
          connectionStatus !== "connected"
        }
        key="join-seat"
        onClick={() => onJoinSeat(game.id)}
        type="button"
      >
        {pendingSeatGameId === game.id ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <span className="text-lg leading-none">◎</span>
        )}
        <span>نشستن</span>
      </button>,
    );
  }

  if (actionRequired?.type === "avalon.nightCheck") {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-info px-2 py-2 text-xs font-bold text-info-content disabled:opacity-45"
        disabled={connectionStatus !== "connected"}
        key="night-check"
        onClick={() => onNightAlreadyCheck(game.id, actionRequired.id)}
        type="button"
      >
        <span className="text-lg leading-none">◐</span>
        <span>دیدم</span>
      </button>,
    );
  }

  if (actionRequired?.type === "avalon.questDecision") {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-success px-2 py-2 text-xs font-bold text-success-content disabled:opacity-45"
        disabled={
          pendingDecisionQuestId === actionRequired.id ||
          connectionStatus !== "connected"
        }
        key="approve"
        onClick={() => onDecideQuest(game.id, actionRequired.id, "approve")}
        type="button"
      >
        <span className="text-lg leading-none">✓</span>
        <span>تایید</span>
      </button>,
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-error px-2 py-2 text-xs font-bold text-error-content disabled:opacity-45"
        disabled={
          pendingDecisionQuestId === actionRequired.id ||
          connectionStatus !== "connected"
        }
        key="disapprove"
        onClick={() => onDecideQuest(game.id, actionRequired.id, "disapprove")}
        type="button"
      >
        <span className="text-lg leading-none">✕</span>
        <span>رد</span>
      </button>,
    );
  }

  if (actionRequired?.type === "avalon.missionVote") {
    actionButtons.push(
      ...missionVoteOrder.map((vote) => {
        const isSuccessVote = vote === "success";

        return (
          <button
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-xs font-bold disabled:opacity-45 ${
              isSuccessVote
                ? "bg-success text-success-content"
                : "bg-error text-error-content"
            }`}
            disabled={
              pendingMissionVoteId === actionRequired.id ||
              connectionStatus !== "connected"
            }
            key={`mission-${vote}`}
            onClick={() => onVoteMission(game.id, actionRequired.id, vote)}
            type="button"
          >
            <span className="text-lg leading-none">◆</span>
            <span>{isSuccessVote ? "موفق" : "شکست"}</span>
          </button>
        );
      }),
    );
  }

  if (isTableView && isNominationMode && nominationQuestId) {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-success px-2 py-2 text-xs font-bold text-success-content disabled:opacity-45"
        disabled={
          selectedTeamSeatIds.length !== teamSlotCount ||
          pendingNominationQuestId === nominationQuestId ||
          connectionStatus !== "connected"
        }
        key="nominate"
        onClick={() =>
          onNominateTeammates(game.id, nominationQuestId, teamSlotCount)
        }
        type="button"
      >
        <span className="text-lg leading-none">
          {selectedTeamSeatIds.length}/{teamSlotCount}
        </span>
        <span>ثبت تیم</span>
      </button>,
    );
  }

  if (isTableView && isLadyTargetMode && ladyCheckId) {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-info px-2 py-2 text-xs font-bold text-info-content disabled:opacity-45"
        disabled={
          !selectedLadyTargetSeatId ||
          pendingLadyTargetId === ladyCheckId ||
          connectionStatus !== "connected"
        }
        key="lady"
        onClick={() => onChooseLadyTarget(game.id, ladyCheckId)}
        type="button"
      >
        <span className="text-lg leading-none">☾</span>
        <span>بررسی</span>
      </button>,
    );
  }

  if (isTableView && isAssassinTargetMode && assassinationId) {
    actionButtons.push(
      <button
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-error px-2 py-2 text-xs font-bold text-error-content disabled:opacity-45"
        disabled={
          !selectedAssassinTargetSeatId ||
          pendingAssassinActionId === assassinationId ||
          connectionStatus !== "connected"
        }
        key="assassin"
        onClick={() => onChooseAssassinTarget(game.id, assassinationId)}
        type="button"
      >
        <span className="text-lg leading-none">†</span>
        <span>ترور</span>
      </button>,
    );
  }

  const actionGridStyle = {
    gridTemplateColumns: `repeat(${Math.max(actionButtons.length, 1)}, minmax(0, 1fr))`,
  } as CSSProperties;
  const missionPathPositions = [
    { left: "16%", top: "18%" },
    { left: "50%", top: "18%" },
    { left: "84%", top: "18%" },
    { left: "34%", top: "78%" },
    { left: "66%", top: "78%" },
  ] as const;

  return (
    <article
      className={
        isTableView
          ? "relative flex h-full min-h-0 flex-col overflow-hidden bg-base-200 text-base-content sm:rounded-lg sm:border sm:border-base-300"
          : "rounded-lg border border-base-300 bg-base-200 p-4"
      }
    >
      {isTableView ? (
        <>
          <div className="shrink-0 px-3 pt-2">
            <div className="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2">
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-black text-warning">
                {game.occupiedSeatCount}/{game.config.playerCount}
              </span>
              <span className="truncate text-xs text-base-content/70">
                {latestPhase
                  ? phaseLabels[latestPhase.type]
                  : statusLabels[game.status]}
              </span>
              <img
                alt="Oberon"
                className={`h-7 w-7 rounded-full border object-cover ${
                  game.config.useOberon
                    ? "border-error opacity-100"
                    : "border-base-content/20 opacity-35 grayscale"
                }`}
                src="/avalon/avalon_characters/Oberon.png"
                title="Oberon"
              />
              <img
                alt="Lady of the Lake"
                className={`h-7 w-7 rounded-full border object-cover ${
                  game.config.useLadyOfTheLake
                    ? "border-info opacity-100"
                    : "border-base-content/20 opacity-35 grayscale"
                }`}
                src="/avalon/avalon_characters/LadyOfTheLake.png"
                title="Lady of the Lake"
              />
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
                  game.config.roleExposing
                    ? "border-warning bg-warning text-warning-content"
                    : "border-base-content/20 bg-base-200 text-base-content/40"
                }`}
                title="Role exposing"
              >
                ◉
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2">
            <div className="relative inline-block aspect-square h-full max-h-[25rem] max-w-full">
              <div className="absolute inset-[16%] rounded-full border border-primary/35 bg-[radial-gradient(circle_at_50%_38%,_var(--color-base-100),_var(--color-base-200)_65%,_var(--color-base-300))] shadow-2xl shadow-base-content/20" />
              <div className="absolute inset-[24%] rounded-full border border-base-content/15 bg-base-100/60" />
              <div className="absolute left-1/2 top-[53%] z-10 h-[32%] w-[50%] -translate-x-1/2 -translate-y-1/2">
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <polyline
                    points="16 18 50 18 84 18 34 78 66 78"
                    stroke="var(--color-warning)"
                    opacity="0.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3.5"
                    fill="none"
                  />
                </svg>
                {missionRules.map((rule, index) => {
                  const round = index + 1;
                  const missionResult = missionResultByRound.get(round);
                  const failMarks = missionResult
                    ? "X".repeat(missionResult.failCount)
                    : rule.minimumFailures > 1
                      ? "XX"
                      : "";
                  const resultClasses =
                    missionResult?.result === "succeeded"
                      ? "border-success bg-success text-success-content"
                      : missionResult?.result === "failed"
                        ? "border-error bg-error text-error-content"
                        : "border-warning/50 bg-base-100 text-warning";

                  return (
                    <div
                      className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-center shadow-lg sm:h-11 sm:w-11 ${resultClasses}`}
                      key={index}
                      title={`ماموریت ${round}: ${rule.players} نفر`}
                      style={missionPathPositions[index]}
                    >
                      <span className="absolute left-1/2 top-0 flex h-3 min-w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-warning/70 bg-base-100 px-0.5 text-[0.45rem] font-bold leading-none text-warning">
                        {round}
                      </span>
                      {!missionResult?.result ? (
                        <span className="pt-1 text-base font-black leading-none sm:text-lg">
                          {rule.players}
                        </span>
                      ) : null}
                      {failMarks ? (
                        <span className="text-xs font-black leading-none text-error sm:text-sm">
                          {failMarks}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {game.seats.map((seat) => renderCouncilSeat(seat))}
            </div>
          </div>

          <div className="z-30 shrink-0 border-t border-base-content/15 bg-base-100/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-base-content/20">
            {latestLadyReveal?.targetSide ? (
              <div
                className={`mb-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs font-bold ${
                  latestLadyReveal.targetSide === "good"
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-error/40 bg-error/15 text-error"
                }`}
              >
                <span>صندلی {latestLadyReveal.targetSeatNumber}</span>
                <span className="rounded-full bg-base-content/10 px-2 py-0.5">
                  {latestLadyReveal.targetSide === "good"
                    ? "تیم خیر"
                    : "تیم شر"}
                </span>
              </div>
            ) : null}

            <details
              className="mb-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs"
              open
            >
              <summary className="cursor-pointer select-none font-bold text-warning">
                اطلاعات شب
              </summary>
              <div className="mt-2 grid gap-2">
                {latestNightSummary ? (
                  <div className="flex flex-wrap items-center gap-2 text-base-content/75">
                    <span className="rounded-full bg-base-content/10 px-2 py-0.5 font-bold">
                      صندلی {latestNightSummary.ownSeatNumber}
                    </span>
                    <span>
                      نقش شما : {roleLabels[latestNightSummary.ownRole]}
                    </span>
                  </div>
                ) : (
                  <p className="text-base-content/60">
                    اطلاعات شب برای صندلی شما وجود ندارد.
                  </p>
                )}

                {nightRevealSeats.length > 0 ? (
                  <div className="flex gap-0.5 ">
                    {nightRevealSeats.map((seat) => (
                      <div
                        className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-base-content/10 bg-base-100/75 px-2 py-1.5"
                        key={seat.seatId}
                      >
                        <div className="min-w-0">
                          <span className="block truncate ">
                            صندلی {seat.seatNumber}
                            {seat.player?.name ? ` - ${seat.player.name}` : ""}
                          </span>
                          <span className="block truncate text-[0.65rem] text-base-content/55">
                            {[
                              seat.side ? sideLabels[seat.side] : null,
                              seat.role ? roleLabels[seat.role] : null,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "صندلی آشکارشده"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : latestNightSummary ? (
                  <p className="text-base-content/60">
                    برای این نقش صندلی دیگری آشکار نمی‌شود.
                  </p>
                ) : null}
              </div>
            </details>

            <div className="mb-2 rounded-md border border-info/25 bg-info/10 px-3 py-2">
              <p className="line-clamp-2 text-xs leading-5 text-base-content">
                {privateMessage || "پیامی ندارید"}
              </p>
            </div>

            <div className="grid gap-2" style={actionGridStyle}>
              {actionButtons.length > 0 ? (
                actionButtons
              ) : (
                <div className="flex min-h-7 flex-1 items-center justify-center rounded-md border border-base-content/20 bg-base-200 text-xs text-base-content/55">
                  اقدامی لازم نیست
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {!isTableView ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">بازی {game.id.slice(0, 8)}</h2>
                <span
                  className={`badge badge-outline ${statusClasses[game.status]}`}
                >
                  {statusLabels[game.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-base-content/60">
                ساخته‌شده توسط {game.creator.name}
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-2">
              {isTableView && isCreator && game.status === "lobby" ? (
                <button
                  className="btn btn-success btn-sm"
                  disabled={
                    !isFull ||
                    startingGameId === game.id ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onStartGame(game.id)}
                  title={
                    isFull
                      ? "شروع بازی"
                      : "برای شروع، همه صندلی‌ها باید پر باشند"
                  }
                  type="button"
                >
                  {startingGameId === game.id ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  شروع بازی
                </button>
              ) : null}

              {isTableView && isCreator && game.status === "lobby" ? (
                <button
                  className="btn btn-error btn-sm"
                  disabled={
                    cancellingGameId === game.id ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onCancelGame(game.id)}
                  type="button"
                >
                  {cancellingGameId === game.id ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  لغو بازی
                </button>
              ) : null}

              {isTableView && game.status === "lobby" && ownSeat ? (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={
                    !selectedSeat ||
                    pendingSeatGameId === game.id ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onChangeSeat(game.id)}
                  type="button"
                >
                  {pendingSeatGameId === game.id ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  تغییر صندلی
                </button>
              ) : null}

              {isTableView && game.status === "lobby" && ownSeat ? (
                <button
                  className="btn btn-outline btn-error btn-sm"
                  disabled={
                    pendingSeatGameId === game.id ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onLeaveSeat(game.id)}
                  type="button"
                >
                  {pendingSeatGameId === game.id ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  ترک صندلی
                </button>
              ) : null}

              {isTableView && game.status === "lobby" && !ownSeat ? (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={
                    !selectedSeat ||
                    pendingSeatGameId === game.id ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onJoinSeat(game.id)}
                  type="button"
                >
                  {pendingSeatGameId === game.id ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  نشستن
                </button>
              ) : null}

              {!tableId ? (
                <Link
                  className="btn btn-outline btn-sm"
                  href={`/games/avalon/tables/${game.id}`}
                >
                  ورود به میز
                </Link>
              ) : null}

              <div className="stats stats-horizontal bg-base-100 shadow-none">
                <div className="stat min-w-24 px-4 py-2">
                  <div className="stat-title text-xs">صندلی‌ها</div>
                  <div className="stat-value text-lg">
                    {game.occupiedSeatCount}/{game.config.playerCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-base-100 px-3 py-2">
              <span className="block text-xs text-base-content/50">اوبرون</span>
              <span>{game.config.useOberon ? "فعال" : "غیرفعال"}</span>
            </div>
            <div className="rounded-md bg-base-100 px-3 py-2">
              <span className="block text-xs text-base-content/50">
                بانوی دریاچه
              </span>
              <span>{game.config.useLadyOfTheLake ? "فعال" : "غیرفعال"}</span>
            </div>
            <div className="rounded-md bg-base-100 px-3 py-2">
              <span className="block text-xs text-base-content/50">نقش‌ها</span>
              <span>{game.config.roleExposing ? "نمایان" : "پنهان"}</span>
            </div>
            <div className="rounded-md bg-base-100 px-3 py-2">
              <span className="block text-xs text-base-content/50">
                زمان ساخت
              </span>
              <span>{formatTime(game.createdAt)}</span>
            </div>
          </div>

          {isTerminalGame ? (
            <div
              className={`mt-4 rounded-md border px-3 py-3 text-sm ${resultTone}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="block text-base font-semibold">
                    {resultTitle}
                  </span>
                  <span className="text-base-content/70">{resultDetail}</span>
                </div>

                <div className="grid gap-1 text-right text-xs text-base-content/60 sm:text-left">
                  {game.endedAt ? (
                    <span>Ended {formatTime(game.endedAt)}</span>
                  ) : null}
                  {game.startedAt ? (
                    <span>Started {formatTime(game.startedAt)}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isTableView && isNominationMode && nominationQuestId ? (
            <div className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="block font-medium text-success">
                    انتخاب تیم ماموریت
                  </span>
                  <span className="text-base-content/70">
                    {selectedTeamSeatIds.length}/{teamSlotCount} صندلی انتخاب
                    شده
                  </span>
                </div>

                <button
                  className="btn btn-success btn-sm w-fit"
                  disabled={
                    selectedTeamSeatIds.length !== teamSlotCount ||
                    pendingNominationQuestId === nominationQuestId ||
                    connectionStatus !== "connected"
                  }
                  onClick={() =>
                    onNominateTeammates(
                      game.id,
                      nominationQuestId,
                      teamSlotCount,
                    )
                  }
                  type="button"
                >
                  {pendingNominationQuestId === nominationQuestId ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  ثبت تیم
                </button>
              </div>

              {selectedTeamSeats.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTeamSeats.map((seat) => (
                    <span className="badge badge-success gap-1" key={seat.id}>
                      صندلی {seat.number}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {isTableView && isLadyTargetMode && ladyCheckId ? (
            <div className="mt-4 rounded-md border border-secondary/30 bg-secondary/10 px-3 py-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="block font-medium text-secondary">
                    Lady of the Lake
                  </span>
                  <span className="text-base-content/70">
                    {selectedLadyTargetSeat
                      ? `Target: seat ${selectedLadyTargetSeat.number}`
                      : "Choose one target seat"}
                  </span>
                </div>

                <button
                  className="btn btn-secondary btn-sm w-fit"
                  disabled={
                    !selectedLadyTargetSeatId ||
                    pendingLadyTargetId === ladyCheckId ||
                    connectionStatus !== "connected"
                  }
                  onClick={() => onChooseLadyTarget(game.id, ladyCheckId)}
                  type="button"
                >
                  {pendingLadyTargetId === ladyCheckId ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  Check Target
                </button>
              </div>
            </div>
          ) : null}

          {isTableView && isAssassinTargetMode && assassinationId ? (
            <div className="mt-4 rounded-md border border-error/30 bg-error/10 px-3 py-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="block font-medium text-error">
                    Assassination
                  </span>
                  <span className="text-base-content/70">
                    {selectedAssassinTargetSeat
                      ? `Target: seat ${selectedAssassinTargetSeat.number}`
                      : "Choose Merlin"}
                  </span>
                </div>

                <button
                  className="btn btn-error btn-sm w-fit"
                  disabled={
                    !selectedAssassinTargetSeatId ||
                    pendingAssassinActionId === assassinationId ||
                    connectionStatus !== "connected"
                  }
                  onClick={() =>
                    onChooseAssassinTarget(game.id, assassinationId)
                  }
                  type="button"
                >
                  {pendingAssassinActionId === assassinationId ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  Choose Merlin
                </button>
              </div>
            </div>
          ) : null}

          {isTableView ? (
            <div className="mt-5 rounded-lg border border-base-300 bg-base-100 p-4">
              <div
                className="mx-auto grid max-w-xl grid-cols-[3rem_minmax(0,1fr)_3rem] grid-rows-[3rem_minmax(14rem,1fr)_3rem] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)_4rem] sm:grid-rows-[4rem_minmax(16rem,1fr)_4rem]"
                dir="ltr"
              >
                <div className="relative col-start-2 flex justify-center gap-2 px-2 before:absolute before:bottom-0 before:left-8 before:right-8 before:h-px before:bg-base-300">
                  {topSeats.map((seat) => renderSeat(seat, "top"))}
                </div>

                <div className="relative col-start-1 row-start-2 flex flex-col justify-center gap-2 py-2 before:absolute before:bottom-8 before:right-0 before:top-8 before:w-px before:bg-base-300">
                  {leftSeats.map((seat) => renderSeat(seat, "left"))}
                </div>

                <div className="relative col-start-2 row-start-2 flex items-center justify-center rounded-xl border border-base-300 bg-base-200 shadow-inner">
                  <div className="absolute bottom-6 left-1/2 top-6 w-px -translate-x-1/2 bg-base-300" />
                  <div className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2 bg-base-300" />
                  <div className="relative z-10 grid w-full max-w-52 grid-cols-5 gap-1 px-3 sm:max-w-56 sm:gap-1.5">
                    {missionRules.map((rule, index) => {
                      const round = index + 1;
                      const missionResult = missionResultByRound.get(round);
                      const isDecidingMission = decidingMissionRound === round;
                      const resultClasses =
                        missionResult?.result === "succeeded"
                          ? "border-success/60 bg-success/15 text-success"
                          : missionResult?.result === "failed"
                            ? "border-error/60 bg-error/15 text-error"
                            : "border-base-300 bg-base-100";
                      const decidingClasses = isDecidingMission
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-base-200"
                        : "";

                      return (
                        <div
                          className={`flex aspect-[4/5] min-h-12 flex-col items-center justify-between rounded-md border px-1 py-1.5 text-center shadow-sm ${resultClasses} ${decidingClasses}`}
                          key={index}
                          title={
                            missionResult?.result
                              ? `Mission ${round}: ${missionResult.result}. Success: ${missionResult.successCount}, fail: ${missionResult.failCount}.`
                              : `Mission ${round}: ${missionResult?.voteCount ?? 0}/${missionResult?.teamMemberCount ?? rule.players} votes.`
                          }
                        >
                          <span className="text-[0.55rem] font-semibold leading-none text-base-content/50">
                            {round}
                          </span>
                          <span className="text-base font-bold leading-none">
                            {missionResult?.result === "succeeded"
                              ? "S"
                              : missionResult?.result === "failed"
                                ? "F"
                                : rule.players}
                          </span>
                          <span
                            className={`text-[0.5rem] font-medium leading-tight ${
                              missionResult?.result === "succeeded"
                                ? "text-success"
                                : "text-error"
                            }`}
                          >
                            {isDecidingMission
                              ? "Deciding"
                              : missionResult?.result === "succeeded"
                                ? "Success"
                                : missionResult?.result === "failed"
                                  ? "Failure"
                                  : `${rule.minimumFailures} fail`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative col-start-3 row-start-2 flex flex-col justify-center gap-2 py-2 before:absolute before:bottom-8 before:left-0 before:top-8 before:w-px before:bg-base-300">
                  {rightSeats.map((seat) => renderSeat(seat, "right"))}
                </div>

                <div className="relative col-start-2 row-start-3 flex justify-center gap-2 px-2 before:absolute before:left-8 before:right-8 before:top-0 before:h-px before:bg-base-300">
                  {bottomSeats.map((seat) => renderSeat(seat, "bottom"))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
