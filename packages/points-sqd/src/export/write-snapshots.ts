import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  PointsLeaderboardSnapshot,
  PointsSnapshotFilePath,
  PointsSnapshotManifest,
  PointsSnapshotManifestFile,
  PointsSnapshotManifestSignature,
  PointsSnapshotMetadata,
  PointsStatsSnapshot,
  QuestCompletionEntry,
  UserPoints,
  UserPointsSnapshot,
  UserStreakInfo,
} from "@yieldshield-lite/points-core";
import type { ApplyPointsResult } from "../compute/apply-points";
import type { IndexedAction } from "../model/types";

export type SnapshotWriteTarget = {
  outputDir: string;
  chainId: number;
  fromBlock: number;
  finalizedBlockNumber: number;
  finalizedBlockTimestamp: string;
  generatedAt: string;
  rulesVersion: string;
  exporterVersion: string;
  actionsHash: string;
  snapshotCid?: string | null;
  runnerSignatures?: PointsSnapshotManifestSignature[];
};

export type SnapshotWriteResult = {
  outputDir: string;
  manifest: PointsSnapshotManifest;
};

type SnapshotFile = {
  path: PointsSnapshotFilePath | "manifest.json";
  absolutePath: string;
  body: string;
};

function createSnapshotMetadata(target: SnapshotWriteTarget): PointsSnapshotMetadata {
  return {
    format: "yieldshield-lite/points-snapshot",
    version: 1,
    generatedAt: target.generatedAt,
    chainId: target.chainId,
    source: "sqd",
    fromBlock: target.fromBlock,
    finalizedBlockNumber: target.finalizedBlockNumber,
    finalizedBlockTimestamp: target.finalizedBlockTimestamp,
    rulesVersion: target.rulesVersion,
    exporterVersion: target.exporterVersion,
  };
}

function toUserPoints(user: ApplyPointsResult["leaderboard"][number]): UserPoints {
  return {
    userAddress: user.userAddress,
    totalPoints: user.totalPoints.toString(),
    lastUpdated: user.lastUpdated,
  };
}

function toUserStreak(user: ApplyPointsResult["leaderboard"][number]): UserStreakInfo | null {
  if (!user.lastActiveDate) {
    return null;
  }

  return {
    userAddress: user.userAddress,
    currentStreak: user.currentStreak.toString(),
    lastActiveDate: user.lastActiveDate,
    longestStreak: user.longestStreak.toString(),
  };
}

function compareIndexedActions(left: IndexedAction, right: IndexedAction) {
  if (left.blockNumber !== right.blockNumber) {
    return left.blockNumber - right.blockNumber;
  }

  if (left.logIndex !== right.logIndex) {
    return left.logIndex - right.logIndex;
  }

  const transactionOrder = left.transactionHash.localeCompare(right.transactionHash);
  if (transactionOrder !== 0) {
    return transactionOrder;
  }

  return left.id.localeCompare(right.id);
}

function toCanonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCanonicalJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, toCanonicalJsonValue(entryValue)]),
    );
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
}

export function serializeSnapshot(snapshot: unknown) {
  return `${JSON.stringify(toCanonicalJsonValue(snapshot), null, 2)}\n`;
}

export function sha256Hex(body: string) {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function hashIndexedActions(actions: IndexedAction[]) {
  return sha256Hex(serializeSnapshot([...actions].sort(compareIndexedActions)));
}

function createManifestFile(file: SnapshotFile): PointsSnapshotManifestFile {
  return {
    path: file.path as PointsSnapshotFilePath,
    sha256: sha256Hex(file.body),
    bytes: Buffer.byteLength(file.body, "utf8"),
    contentType: "application/json",
  };
}

async function writeSnapshotFile(file: SnapshotFile) {
  await mkdir(dirname(file.absolutePath), { recursive: true });
  await writeFile(file.absolutePath, file.body, "utf8");
}

function requireTargetMetadata(target: SnapshotWriteTarget) {
  const requiredFields: (keyof SnapshotWriteTarget)[] = [
    "chainId",
    "fromBlock",
    "finalizedBlockNumber",
    "finalizedBlockTimestamp",
    "generatedAt",
    "rulesVersion",
    "exporterVersion",
    "actionsHash",
  ];

  for (const field of requiredFields) {
    if (target[field] === undefined || target[field] === null || target[field] === "") {
      throw new Error(`Missing required snapshot metadata: ${field}`);
    }
  }
}

export async function writeSnapshots(
  result: ApplyPointsResult,
  target: SnapshotWriteTarget,
): Promise<SnapshotWriteResult> {
  requireTargetMetadata(target);

  const metadata = createSnapshotMetadata(target);
  const usersDir = join(target.outputDir, "users");
  const leaderboardUsers = result.leaderboard.map(toUserPoints);
  const files: SnapshotFile[] = [];

  await mkdir(target.outputDir, { recursive: true });
  await rm(usersDir, { recursive: true, force: true });
  await mkdir(usersDir, { recursive: true });

  const leaderboardSnapshot: PointsLeaderboardSnapshot = {
    metadata,
    totalUsers: leaderboardUsers.length,
    totalDistributedPoints: result.totalDistributedPoints.toString(),
    users: leaderboardUsers,
  };

  const statsSnapshot: PointsStatsSnapshot = {
    metadata,
    totalUsers: leaderboardUsers.length,
    totalDistributedPoints: result.totalDistributedPoints.toString(),
  };

  files.push(
    {
      path: "leaderboard.json",
      absolutePath: join(target.outputDir, "leaderboard.json"),
      body: serializeSnapshot(leaderboardSnapshot),
    },
    {
      path: "stats.json",
      absolutePath: join(target.outputDir, "stats.json"),
      body: serializeSnapshot(statsSnapshot),
    },
  );

  for (const [index, user] of result.leaderboard.entries()) {
    const userSnapshot: UserPointsSnapshot = {
      metadata,
      user: toUserPoints(user),
      rank: index + 1,
      streak: toUserStreak(user),
      questCompletions: user.questCompletions.map(
        completion =>
          ({
            ...completion,
            poolAddress: completion.poolAddress ?? null,
          }) satisfies QuestCompletionEntry,
      ),
    };

    const userPath = `users/${user.userAddress}.json` as const;
    files.push({
      path: userPath,
      absolutePath: join(target.outputDir, userPath),
      body: serializeSnapshot(userSnapshot),
    });
  }

  const manifestFiles = files.map(createManifestFile).sort((left, right) => left.path.localeCompare(right.path));
  const manifest: PointsSnapshotManifest = {
    format: "yieldshield-lite/points-snapshot-manifest",
    schemaVersion: 1,
    snapshotVersion: 1,
    chainId: target.chainId,
    source: "sqd",
    fromBlock: target.fromBlock,
    finalizedBlockNumber: target.finalizedBlockNumber,
    finalizedBlockTimestamp: target.finalizedBlockTimestamp,
    generatedAt: target.generatedAt,
    rulesVersion: target.rulesVersion,
    exporterVersion: target.exporterVersion,
    actionsHash: target.actionsHash,
    files: manifestFiles,
    snapshotCid: target.snapshotCid ?? null,
    runnerSignatures: target.runnerSignatures ?? [],
  };

  for (const file of files.sort((left, right) => left.path.localeCompare(right.path))) {
    await writeSnapshotFile(file);
  }

  await writeSnapshotFile({
    path: "manifest.json",
    absolutePath: join(target.outputDir, "manifest.json"),
    body: serializeSnapshot(manifest),
  });

  return {
    outputDir: target.outputDir,
    manifest,
  };
}
