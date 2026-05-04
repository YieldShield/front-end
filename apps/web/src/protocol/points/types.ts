import type {
  PointsLeaderboardSnapshot,
  PointsSnapshotFilePath,
  PointsSnapshotManifest,
  PointsSnapshotMetadata,
  PointsStatsSnapshot,
  QuestCompletionEntry,
  UserPoints,
  UserPointsSnapshot,
  UserStreakInfo,
} from "@yieldshield-lite/points-core";

export type {
  PointsLeaderboardSnapshot,
  PointsSnapshotFilePath,
  PointsSnapshotManifest,
  PointsSnapshotMetadata,
  PointsStatsSnapshot,
  QuestCompletionEntry,
  UserPoints,
  UserPointsSnapshot,
  UserStreakInfo,
} from "@yieldshield-lite/points-core";

export type PointsGlobalStats = {
  totalUsers: number;
  totalDistributedPoints: bigint;
};

export type PointsProvider = {
  fetchTopUsers(limit?: number): Promise<UserPoints[]>;
  fetchGlobalStats(): Promise<PointsGlobalStats>;
  fetchUserSnapshot(userAddress: string): Promise<UserPointsSnapshot | null>;
  fetchUserPoints(userAddress: string): Promise<UserPoints | null>;
  fetchUserQuestProgress(userAddress: string): Promise<QuestCompletionEntry[]>;
  fetchUserStreak(userAddress: string): Promise<UserStreakInfo | null>;
  fetchUserRank(userAddress: string): Promise<number | null>;
  isConfigured(): boolean;
};

export type PointsSnapshotSource = {
  manifest: PointsSnapshotManifest | null;
  metadata: PointsSnapshotMetadata | null;
};
