import type { AvalonActionResult } from "@/types/avalon-action";
import type {
  AvalonGameConfig,
  AvalonGameStatus,
  AvalonQuestDecisionValue,
  AvalonRoleName,
  AvalonSide,
  AvalonSeatActionRequired,
} from "@/types/avalon";

export type AvalonWsSeat = {
  id: string;
  number: number;
  role?: AvalonRoleName;
  player: {
    id: string;
    name: string;
    profileImage: string;
    isOnline: boolean;
  } | null;
};

export type AvalonWsGame = {
  id: string;
  name: string;
  status: AvalonGameStatus;
  winnerSide: AvalonSide | null;
  config: AvalonGameConfig;
  creator: {
    id: string;
    name: string;
    profileImage: string;
  };
  seats: AvalonWsSeat[];
  occupiedSeatCount: number;
  publicMessage: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  phases: AvalonWsPhase[];
};

export type AvalonWsPhase = {
  id: string;
  type: "night" | "quest" | "mission" | "ladyCheck" | "assassination" | "unknown";
  createdAt: string;
  endedAt: string | null;
  night: {
    checkedCount: number;
    totalCount: number;
    checkedSeatIds: string[];
    summary: {
      ownSeatId: string;
      ownSeatNumber: number;
      ownRole: AvalonRoleName;
      revealSeats: {
        seatId: string;
        seatNumber: number;
        player: {
          id: string;
          name: string;
          profileImage: string;
        } | null;
        side?: AvalonSide;
        role?: AvalonRoleName;
      }[];
    } | null;
  } | null;
  quest: {
    kingSeatNumber: number;
    kingPlayerName: string | null;
    teamMemberCount: number;
    teamMemberSeatIds: string[];
    teamMemberSeatNumbers: number[];
    teamSlotCount: number;
    decisionCount: number;
    approveCount: number;
    disapproveCount: number;
    decisionVotes: {
      id: string;
      seatId: string;
      seatNumber: number;
      playerId: string | null;
      playerName: string | null;
      playerProfileImage: string | null;
      decision: AvalonQuestDecisionValue;
    }[];
  } | null;
  mission: {
    missionRound: number;
    teamMemberCount: number;
    teamMembers: {
      seatId: string;
      seatNumber: number;
      playerName: string | null;
    }[];
    voteCount: number;
    successCount: number;
    failCount: number;
    result: "succeeded" | "failed" | null;
  } | null;
  ladyCheck: {
    id: string;
    ladySeatId: string;
    ladySeatNumber: number;
    targetSeatId: string;
    targetSeatNumber: number;
    targetSide?: AvalonSide;
  } | null;
};

export type AvalonWsUser = {
  id: string;
  name: string;
  profileImage: string;
};

export type AvalonTableSnapshot = {
  snapshotVersion: number;
  gameId: string | null;
  tableInfo: AvalonWsGame | null;
  privateMessage: string | null;
  actionRequired: AvalonSeatActionRequired | null;
};

export type AvalonWsMessage =
  | {
      type: "hello";
      data: {
        endpoint: string;
        capabilities?: string[];
        user?: AvalonWsUser | null;
      };
      sentAt: string;
    }
  | {
      type: "avalon.games";
      data: {
        games: AvalonWsGame[];
        snapshotVersion: number;
      };
      sentAt: string;
    }
  | {
      type: "avalon.table";
      data: AvalonTableSnapshot;
      sentAt: string;
    }
  | {
      type: "pong";
      data: null;
      sentAt: string;
    }
  | {
      type: "error";
      data: {
        message: string;
      };
      sentAt: string;
    }
  | {
      type:
        | "avalon.cancelGame.result"
        | "avalon.startGame.result"
        | "avalon.seat.result"
        | "avalon.nightAlreadyCheck.result"
        | "avalon.nominateTeammates.result"
        | "avalon.questDecision.result"
        | "avalon.missionVote.result"
        | "avalon.ladyTarget.result"
        | "avalon.assassinAction.result";
      data: AvalonActionResult;
      sentAt: string;
    };

export type ConnectionStatus =
  | "connecting"
  | "syncing"
  | "connected"
  | "disconnected"
  | "error";
