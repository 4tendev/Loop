import type { AvalonActionResult } from "@/types/avalon-action";
import type {
  AvalonGameConfig,
  AvalonGameStatus,
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
  } | null;
};

export type AvalonWsGame = {
  id: string;
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
  } | null;
  quest: {
    kingSeatNumber: number;
    kingPlayerName: string | null;
    teamMemberCount: number;
    teamSlotCount: number;
    decisionCount: number;
  } | null;
  mission: {
    missionRound: number;
    teamMemberCount: number;
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
  gameId: string | null;
  tableInfo: AvalonWsGame | null;
  privateMessage: string;
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
      data: AvalonWsGame[];
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
  | "connected"
  | "disconnected"
  | "error";
