export type QuestDefinition = {
  id: string;
  name: string;
  points: number;
  category: "saver" | "protector" | "creator";
};

export type StreakTier = {
  minDays: number;
  multiplier: string;
  name: string;
};

export type RepeatableActionDefinition = {
  id: string;
  points: number;
  dailyCap: number;
};

export type JourneyBonus = {
  label: string;
  points: number;
  ids: string[];
};

export type UserPoints = {
  userAddress: string;
  totalPoints: string;
  lastUpdated: string;
};

export type QuestCompletionEntry = {
  id: string;
  userAddress: string;
  questId: string;
  points: string;
  completedAt: string;
  poolAddress?: string | null;
};

export type UserStreakInfo = {
  userAddress: string;
  currentStreak: string;
  lastActiveDate: string;
  longestStreak: string;
};

export type ContractName = "SplitRiskPoolFactory" | "SplitRiskPool" | "YSGovernor";

export type FactoryEventName = "PoolCreated";

export type PoolEventName =
  | "ShieldedAssetDeposited"
  | "ProtectorAssetDeposited"
  | "CommissionClaimed"
  | "RewardsClaimed"
  | "ShieldedWithdrawal"
  | "PartialWithdrawal"
  | "UnlockProcessStarted"
  | "ShieldActivated"
  | "UnlockProcessCancelled"
  | "PoolFeePaid";

export type GovernorEventName =
  | "ProposalCreated"
  | "VoteCast"
  | "VoteCastWithParams"
  | "ProposalQueued"
  | "ProposalExecuted"
  | "ProposalCanceled";

export type SupportedEventName = FactoryEventName | PoolEventName | GovernorEventName;

export type IndexedActionMetadataValue = string | number | boolean | null | string[] | number[];
export type IndexedActionMetadata = Record<string, IndexedActionMetadataValue>;

export type IndexedAction = {
  id: string;
  chainId: number;
  contractName: ContractName;
  contractAddress: string;
  eventName: SupportedEventName;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  userAddress?: string;
  poolAddress?: string;
  assetAddress?: string;
  amount?: string;
  action: string;
  occurredAt: string;
  questId?: string | null;
  repeatableActionId?: string | null;
  metadata?: IndexedActionMetadata;
};

export type NormalizedLogContext = {
  chainId: number;
  contractAddress: string;
  blockNumber: bigint | number | string;
  blockTimestamp: bigint | number | string;
  transactionHash: string;
  logIndex: bigint | number | string;
};

export type FactoryAddressTemplate = {
  kind: "factory-template";
  factoryAddress: string;
  eventName: "PoolCreated";
  parameter: "poolAddress";
};

export type ProcessorContract =
  | {
      name: "SplitRiskPoolFactory";
      address: string;
      startBlock: number;
      events: readonly FactoryEventName[];
      abi: unknown;
    }
  | {
      name: "SplitRiskPool";
      address: FactoryAddressTemplate;
      startBlock: number;
      events: readonly PoolEventName[];
      abi: unknown;
    }
  | {
      name: "YSGovernor";
      address: string;
      startBlock: number;
      events: readonly GovernorEventName[];
      abi: unknown;
    };

export type BuildProcessorResult = {
  chainId: number;
  contracts: ProcessorContract[];
};

export type UserLedgerRow = {
  userAddress: string;
  totalPoints: bigint;
  questPoints: bigint;
  repeatablePoints: bigint;
  questIds: Set<string>;
  questCompletions: QuestCompletionEntry[];
  activityDates: Set<string>;
  dailyActionCounts: Map<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  lastUpdated: string;
};

export type PointsSnapshotFilePath = "leaderboard.json" | "stats.json" | `users/${string}.json`;

export type PointsSnapshotManifestFile = {
  path: PointsSnapshotFilePath;
  sha256: string;
  bytes: number;
  contentType: "application/json";
};

export type PointsSnapshotManifestSignature = {
  signer: string;
  signature: string;
  signedAt: string;
};

export type PointsSnapshotManifest = {
  format: "yieldshield-lite/points-snapshot-manifest";
  schemaVersion: 1;
  snapshotVersion: 1;
  chainId: number;
  source: "sqd";
  fromBlock: number;
  finalizedBlockNumber: number;
  finalizedBlockTimestamp: string;
  generatedAt: string;
  rulesVersion: string;
  exporterVersion: string;
  actionsHash: string;
  files: PointsSnapshotManifestFile[];
  snapshotCid?: string | null;
  runnerSignatures: PointsSnapshotManifestSignature[];
};

export type PointsSnapshotMetadata = {
  format: "yieldshield-lite/points-snapshot";
  version: 1;
  generatedAt: string;
  chainId: number;
  source: "sqd" | "browser" | "graphql";
  fromBlock: number;
  finalizedBlockNumber: number;
  finalizedBlockTimestamp: string;
  rulesVersion: string;
  exporterVersion: string;
};

export type PointsLeaderboardSnapshot = {
  metadata: PointsSnapshotMetadata;
  totalUsers: number;
  totalDistributedPoints: string;
  users: UserPoints[];
};

export type UserPointsSnapshot = {
  metadata: PointsSnapshotMetadata;
  user: UserPoints | null;
  rank: number | null;
  streak: UserStreakInfo | null;
  questCompletions: QuestCompletionEntry[];
};

export type PointsStatsSnapshot = {
  metadata: PointsSnapshotMetadata;
  totalUsers: number;
  totalDistributedPoints: string;
};
