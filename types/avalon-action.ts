export const avalonActionTypes = [
  "avalon.cancelGame",
  "avalon.startGame",
  "avalon.joinSeat",
  "avalon.changeSeat",
  "avalon.leaveSeat",
  "avalon.nightCheck",
  "avalon.nightAlreadyCheck",
  "avalon.nominateTeammates",
  "avalon.questDecision",
  "avalon.missionVote",
  "avalon.ladyTarget",
  "avalon.assassinAction",
] as const;

export type AvalonActionType = (typeof avalonActionTypes)[number];

export type AvalonAction = {
  type: AvalonActionType;
  label: string;
  possible: boolean;
  required: boolean;
};

export type AvalonActionResult = {
  ok: boolean;
  message: string;
  gameId?: string;
  startedAt?: string;
  seatId?: string;
  nightCheckId?: string;
  questId?: string;
  nominatedSeatIds?: string[];
  decision?: "approve" | "disapprove";
  decisionCount?: number;
  approveCount?: number;
  disapproveCount?: number;
  missionId?: string;
  vote?: "success" | "fail";
  voteCount?: number;
  successCount?: number;
  failCount?: number;
  ladyCheckId?: string;
  assassinationId?: string;
  targetSeatId?: string;
  targetSeatNumber?: number;
  winnerSide?: "good" | "evil";
  finalResult?: "approved" | "disapproved" | "succeeded" | "failed" | null;
};
