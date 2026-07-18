import type {
  AvalonGameConfig,
  AvalonGameStatus,
  AvalonRoleName,
  AvalonSide,
} from "./avalon";

export type AvalonHistoryItem = {
  id: string;
  name: string;
  status: Extract<AvalonGameStatus, "completed" | "cancelled">;
  winnerSide: AvalonSide | null;
  playerCount: AvalonGameConfig["playerCount"];
  creatorName: string;
  userRole: AvalonRoleName | null;
  userSide: AvalonSide | null;
  successfulMissions: number;
  failedMissions: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};
