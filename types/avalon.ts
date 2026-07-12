import { User } from "./user";
import type { AvalonActionType } from "./avalon-action";

export const avalonCorePlayerRoles = [
  { name: "merlin", side: "good" },
  { name: "percival", side: "good" },
  { name: "servant", side: "good" },
  { name: "assassin", side: "evil" },
  { name: "morgana", side: "evil" },
  { name: "mordred", side: "evil" },
  { name: "oberon", side: "evil" },
] as const;

export type AvalonPlayerRole = (typeof avalonCorePlayerRoles)[number];

export type AvalonRoleName = AvalonPlayerRole["name"];

export type AvalonSide = AvalonPlayerRole["side"];

export const avalonGameStatuses = [
  "lobby",
  "inProgress",
  "completed",
  "cancelled",
] as const;

export type AvalonGameStatus = (typeof avalonGameStatuses)[number];

export const avalonQuestDecisionValues = ["approve", "disapprove"] as const;

export type AvalonQuestDecisionValue =
  (typeof avalonQuestDecisionValues)[number];

export const avalonMissionVoteValues = ["success", "fail"] as const;

export type AvalonMissionVoteValue = (typeof avalonMissionVoteValues)[number];

export type AvalonSeatActionRequired = {
  type: AvalonActionType;
  id: string;
};

export type AvalonSeat = {
  id: string;
  role: AvalonRoleName;
  number: number;
  privateMessage: string | null;
  actionRequired: AvalonSeatActionRequired | null;
  player: User | null;
};

export type AvalonQuestDecision = {
  id: string;
  seat: AvalonSeat;
  decision: AvalonQuestDecisionValue;
  quest: AvalonQuest["id"];
};

export type AvalonQuest = {
  id: string;
  king: AvalonSeat;
  teamMembers: AvalonSeat[];
  decisions: AvalonQuestDecision[];
};

export type AvalonMissionVote = {
  id: string;
  seat: AvalonSeat;
  vote: AvalonMissionVoteValue;
  createdAt: Date;
};

export type AvalonLadyCheck = {
  id: string;
  lady: AvalonSeat;
  target: AvalonSeat;
};

export type AvalonMission = {
  id: string;
  quest: AvalonQuest;
  votes: AvalonMissionVote[];
};

export type AvalonGameConfig = {
  playerCount: 7 | 8 | 10 | 9;
  useOberon: boolean;
  useLadyOfTheLake: boolean;
  roleExposing: boolean;
};

export const avalonMissionRulesByPlayerCount = {

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
} as const;

export const playerCounts = Object.keys(
  avalonMissionRulesByPlayerCount
).map(Number) as (keyof typeof avalonMissionRulesByPlayerCount)[];


export type AvalonGame = {
  id: string;
  creator: User;
  status: AvalonGameStatus;
  config: AvalonGameConfig;
  seats: AvalonSeat[];
  publicMessage: string;
  winnerSide: AvalonSide | null;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  phases: Phase[];
};

export type AvalonNightCheck = {
  id: string;
  night: AvalonNight;
  seat: AvalonSeat;
  isChecked: boolean;
};

export type AvalonNight = {
  id: string;
  checks: AvalonNightCheck[];
};

export type AvalonAssassination = {
  id: string;
  target: AvalonSeat | null;
};

export type AvalonPhase =
  | AvalonMission
  | AvalonQuest
  | AvalonLadyCheck
  | AvalonNight
  | AvalonAssassination;

export type Phase = {
  id: string;
  phase: AvalonPhase;
  createdAt: Date;
  endedAt: Date | null;
};

export type CreateAvalonGameInput = {
  user: User;
  config: AvalonGameConfig;
};
