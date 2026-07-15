import type { CSSProperties } from "react";

import { getProfileImageSrc } from "@/lib/profile-image";
import type { AvalonQuestDecisionValue } from "@/types/avalon";

import { evilRoleNames, roleImageByName } from "./avalonTableCardConstants";
import type { AvalonWsGame, AvalonWsSeat } from "./types";

type SeatPosition = "top" | "right" | "bottom" | "left";

type AvalonTableSeatProps = {
  game: AvalonWsGame;
  seat: AvalonWsSeat;
  variant: "grid" | "council";
  position?: SeatPosition;
  ownSeatId?: string;
  selectedSeatId: string | null;
  selectedTeamSeatIds: string[];
  activeQuestTeamSeatNumbers: Set<number>;
  selectedLadyTargetSeatId: string | null;
  selectedAssassinTargetSeatId: string | null;
  nominationQuestId: string | null;
  ladyCheckId: string | null;
  assassinationId: string | null;
  teamSlotCount: number;
  isTerminalGame: boolean;
  isAssassinationPhase: boolean;
  activeLadySeatId: string | null;
  lastKingSeatNumber: number | null;
  lastKingPlayerName?: string | null;
  revealedQuestDecisions: Map<string, AvalonQuestDecisionValue> | null;
  sleepingSeatIds: Set<string>;
  onSelectSeat: (game: AvalonWsGame, seat: AvalonWsSeat) => void;
  onToggleTeamSeat: (questId: string, seatId: string, teamSlotCount: number) => void;
  onSelectLadyTarget: (ladyCheckId: string, seatId: string) => void;
  onSelectAssassinTarget: (assassinationId: string, seatId: string) => void;
};

const connectorClasses: Record<SeatPosition, string> = {
  top: "bottom-0 left-1/2 h-5 w-px -translate-x-1/2",
  right: "left-0 top-1/2 h-px w-5 -translate-y-1/2",
  bottom: "left-1/2 top-0 h-5 w-px -translate-x-1/2",
  left: "right-0 top-1/2 h-px w-5 -translate-y-1/2",
};

export function AvalonTableSeat(props: AvalonTableSeatProps) {
  const { game, seat } = props;
  const isOwnSeat = props.ownSeatId === seat.id;
  const isSelectedForTeam = props.selectedTeamSeatIds.includes(seat.id);
  const isMateSeat = isSelectedForTeam || props.activeQuestTeamSeatNumbers.has(seat.number);
  const isSelectedForLadyTarget = props.selectedLadyTargetSeatId === seat.id;
  const isSelectedForAssassinTarget = props.selectedAssassinTargetSeatId === seat.id;
  const isLadySeat = props.activeLadySeatId === seat.id;
  const canToggleTeamSeat = !props.isTerminalGame && Boolean(props.nominationQuestId) && Boolean(seat.player);
  const canSelectLadyTarget = !props.isTerminalGame && Boolean(props.ladyCheckId) && Boolean(seat.player) && !isOwnSeat;
  const canSelectAssassinTarget = !props.isTerminalGame && Boolean(props.assassinationId) && Boolean(seat.player);
  const roleImage = seat.role ? roleImageByName[seat.role] : null;
  const showRoleImage = Boolean(roleImage) && (props.isTerminalGame || (props.isAssassinationPhase && Boolean(seat.role && evilRoleNames.has(seat.role))));
  const seatSide = seat.role
    ? evilRoleNames.has(seat.role)
      ? "evil"
      : "good"
    : null;
  const isWinningSeat =
    game.status === "completed" &&
    Boolean(game.winnerSide) &&
    seatSide === game.winnerSide;
  const seatImage = showRoleImage ? (roleImage ?? getProfileImageSrc(seat.player?.profileImage)) : getProfileImageSrc(seat.player?.profileImage);
  const seatImageAlt = showRoleImage && seat.role ? seat.role : (seat.player?.name ?? `Seat ${seat.number}`);
  const isOnline = seat.player?.isOnline ?? false;
  const presenceLabel = isOnline ? "آنلاین" : "آفلاین";
  const presenceBadge = seat.player ? (
    <span
      aria-label={`${seat.player.name}: ${presenceLabel}`}
      className={`pointer-events-none absolute top-0 left-0 z-40 h-2.5 w-2.5 rounded-full border-2 border-base-100 shadow-sm ${
        isOnline ? "bg-success" : "bg-base-content/35"
      }`}
      title={presenceLabel}
    >
      {isOnline ? (
        <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-ping" />
      ) : null}
    </span>
  ) : null;
  const revealedQuestDecision = props.revealedQuestDecisions?.get(seat.id);
  const isSleeping = Boolean(seat.player) && props.sleepingSeatIds.has(seat.id);
  const sleepingBadge = isSleeping ? (
    <span
      aria-label="در انتظار تأیید بررسی شب"
      className="pointer-events-none absolute -top-3 left-1/4 z-50 -translate-x-1/2 text-xs leading-none drop-shadow-md"
      title="این بازیکن هنوز بررسی شب را تأیید نکرده است"
    >
      💤
    </span>
  ) : null;
  const decisionBadge = revealedQuestDecision ? (
    <span
      className={`pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-1 text-[0.6rem] font-black leading-none shadow-lg sm:text-[0.65rem] ${
        revealedQuestDecision === "approve"
          ? "border-success-content/30 bg-success text-success-content"
          : "border-error-content/30 bg-error text-error-content"
      }`}
    >
      {revealedQuestDecision === "approve" ? "تایید" : "رد"}
    </span>
  ) : null;

  function handleClick() {
    if (canToggleTeamSeat && props.nominationQuestId) return props.onToggleTeamSeat(props.nominationQuestId, seat.id, props.teamSlotCount);
    if (canSelectLadyTarget && props.ladyCheckId) return props.onSelectLadyTarget(props.ladyCheckId, seat.id);
    if (canSelectAssassinTarget && props.assassinationId) return props.onSelectAssassinTarget(props.assassinationId, seat.id);
    if (!props.isTerminalGame) props.onSelectSeat(game, seat);
  }

  if (props.variant === "grid") {
    const position = props.position ?? "top";
    const tone = isSelectedForTeam ? "border-success bg-success text-success-content shadow-success/30" : isSelectedForLadyTarget ? "border-secondary bg-secondary text-secondary-content shadow-secondary/30" : isSelectedForAssassinTarget ? "border-error bg-error text-error-content shadow-error/30" : props.selectedSeatId === seat.id ? "border-primary bg-primary text-primary-content shadow-primary/30" : seat.player ? canToggleTeamSeat || canSelectLadyTarget || canSelectAssassinTarget ? "border-base-300 bg-base-100 hover:border-success hover:bg-success/10" : "border-base-300 bg-base-100" : "border-base-300 bg-base-100 hover:border-primary hover:bg-primary/10";
    return <div className="relative z-10 flex min-h-12 min-w-12 flex-1 items-center justify-center"><span className={`absolute bg-base-300 ${connectorClasses[position]}`} /><button aria-label={seat.player ? `صندلی ${seat.number}: ${seat.player.name} (${presenceLabel})` : `صندلی ${seat.number}`} className={`relative z-10 flex items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition ${isWinningSeat ? "avalon-winner-seat h-16 w-16" : "h-12 w-12"} ${tone} ${isOwnSeat ? "outline outline-2 outline-offset-2 outline-primary shadow-primary/40" : ""}`} data-winner-side={isWinningSeat ? game.winnerSide : undefined} onClick={handleClick} title={seat.player ? `${seat.player.name} · ${presenceLabel}` : "صندلی خالی"} type="button">{isWinningSeat ? <span aria-hidden="true" className="avalon-winner-sparkles">✦</span> : null}{sleepingBadge}{decisionBadge}{presenceBadge}{isOwnSeat ? <span className="pointer-events-none absolute -right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-primary/50 bg-primary px-1.5 py-0.5 text-[0.55rem] font-black uppercase leading-none text-primary-content shadow">شما</span> : null}{isLadySeat ? <img alt="Lady of the Lake" className="pointer-events-none absolute -left-2 bottom-0 z-30 h-7 w-7 translate-y-1/2 rounded-full border border-secondary/50 bg-base-100 object-cover p-0.5 shadow-lg" src="/avalon/avalon_characters/LadyOfTheLake.png" title={`Lady of the Lake · Seat ${seat.number}`} /> : null}{isMateSeat ? <img alt="Selected teammate" className="pointer-events-none absolute -right-2 bottom-0 z-20 h-7 w-7 translate-y-1/2 rounded-full border border-success/50 bg-base-100 object-cover p-0.5 shadow-lg" src="/avalon/Mate.png" title={`Seat ${seat.number}`} /> : null}{seat.player ? <img alt={seatImageAlt} className={`relative z-10 rounded-full object-cover transition ${isWinningSeat ? "h-14 w-14" : "h-10 w-10"} ${isOnline || props.isTerminalGame ? "" : "grayscale opacity-55"}`} src={seatImage} /> : seat.number}</button></div>;
  }

  const angle = -90 + ((seat.number - 1) * 360) / game.seats.length;
  const radians = (angle * Math.PI) / 180;
  const inwardX = -Math.cos(radians);
  const inwardY = -Math.sin(radians);
  const isLastKing = props.lastKingSeatNumber === seat.number;
  const showKingBadge = isLastKing && !props.activeLadySeatId;
  const markerStyle = (distance: number) => ({ transform: "translate(-50%, -50%)", left: `calc(50% + ${(inwardX * distance).toFixed(3)}rem)`, top: `calc(50% + ${(inwardY * distance).toFixed(3)}rem)` }) as CSSProperties;
  const seatStyle = { left: `${50 + Math.cos(radians) * 43}%`, top: `${50 + Math.sin(radians) * 43}%` } as CSSProperties;
  const tone = isSelectedForTeam ? "border-success bg-success text-success-content shadow-success/30" : isSelectedForLadyTarget ? "border-info bg-info text-info-content shadow-info/30" : isSelectedForAssassinTarget ? "border-error bg-error text-error-content shadow-error/30" : props.selectedSeatId === seat.id ? "border-warning bg-warning text-warning-content shadow-warning/30" : seat.player ? "border-base-300 bg-base-100 text-base-content" : "border-base-300 bg-base-200 text-base-content/70";
  const displayName = seat.player ? Array.from(seat.player.name).slice(0, 10).join("") : "";

  return <button aria-label={seat.player ? `صندلی ${seat.number}: ${seat.player.name} (${presenceLabel})` : `صندلی ${seat.number}`} className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition ${isWinningSeat ? "avalon-winner-seat h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14"} ${tone} ${canToggleTeamSeat || canSelectLadyTarget || canSelectAssassinTarget ? "ring-2 ring-warning/70" : ""} ${isOwnSeat ? "outline outline-2 outline-offset-2 outline-primary shadow-primary/40" : ""}`} data-winner-side={isWinningSeat ? game.winnerSide : undefined} onClick={handleClick} title={seat.player ? `${seat.player.name} · ${presenceLabel}` : "صندلی خالی"} type="button" style={seatStyle}>{isWinningSeat ? <span aria-hidden="true" className="avalon-winner-sparkles">✦</span> : null}{sleepingBadge}{decisionBadge}{presenceBadge}<span className="pointer-events-none absolute left-1/2 top-0 z-40 flex h-4 min-w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-warning/40 bg-base-100/90 px-1 text-[0.6rem] font-black leading-none text-warning shadow">{seat.number}</span>{isOwnSeat ? <span className="pointer-events-none absolute -right-3 top-1/4 z-20 -translate-y-1/2 rounded-full border border-primary/50 bg-primary px-0.5 py-0.5 text-[0.55rem] font-black uppercase leading-none text-primary-content shadow sm:-right-4">شما</span> : null}{showKingBadge ? <img alt="Last king" className="pointer-events-none absolute z-30 h-7 w-7 rounded-full border border-warning/50 bg-base-100 object-cover p-0.5 shadow-lg sm:h-8 sm:w-8" src="/avalon/King.png" style={markerStyle(2.7)} title={props.lastKingPlayerName ?? `Seat ${seat.number}`} /> : null}{isLadySeat ? <img alt="Lady of the Lake" className="pointer-events-none absolute z-30 h-7 w-7 rounded-full border border-secondary/50 bg-base-100 object-cover p-0.5 shadow-lg sm:h-8 sm:w-8" src="/avalon/avalon_characters/LadyOfTheLake.png" style={markerStyle(2.7)} title={`Lady of the Lake · Seat ${seat.number}`} /> : null}{isMateSeat ? <img alt="Selected teammate" className="pointer-events-none absolute z-30 h-7 w-7 rounded-full border border-success/50 bg-base-100 object-cover p-0.5 shadow-lg sm:h-8 sm:w-8" src="/avalon/Mate.png" style={markerStyle(showKingBadge || isLadySeat ? 3.5 : 2.7)} title={`Seat ${seat.number}`} /> : null}{seat.player ? <><img alt={seatImageAlt} className={`relative z-10 rounded-full object-cover transition ${isWinningSeat ? "h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-9 w-9 sm:h-11 sm:w-11"} ${isOnline || props.isTerminalGame ? "" : "grayscale opacity-55"}`} src={seatImage} /><span className={`pointer-events-none absolute left-1/2 z-40 max-w-20 -translate-x-1/2 truncate whitespace-nowrap rounded bg-base-100/90 px-1 text-[0.55rem] font-bold leading-4 text-base-content shadow ${seat.number === 1 ? "bottom-[calc(100%+0.6rem)]" : "top-[calc(100%+0.125rem)]"}`}>{displayName}</span></> : seat.number}</button>;
}
