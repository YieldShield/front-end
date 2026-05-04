import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { applyPoints } from "../compute/apply-points.js";
import { ADDR_A, ADDR_B, deterministicSnapshotTarget, makeAction } from "../test/fixtures.js";
import { hashIndexedActions, writeSnapshots } from "./write-snapshots.js";

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "yieldshield-points-"));
}

async function readJson<T>(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function listFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        return listFiles(root, absolutePath);
      }

      return [relative(root, absolutePath)];
    }),
  );

  return nested.flat().sort();
}

async function hashFile(path: string) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function hashDirectory(root: string) {
  const files = await listFiles(root);
  const combined = createHash("sha256");

  for (const file of files) {
    combined.update(file);
    combined.update(await readFile(join(root, file)));
  }

  return combined.digest("hex");
}

test("writes leaderboard, stats, manifest, and per-user snapshot files", async () => {
  const outputDir = await makeTempDir();

  try {
    const actions = [
      makeAction({ questId: "creator_pool_architect", repeatableActionId: "create_pool" }),
      makeAction({
        transactionHash: "0xtx2",
        logIndex: 1,
        questId: "saver_first_shield",
        repeatableActionId: "saver_deposit",
      }),
    ];
    const result = applyPoints(actions);
    const snapshot = await writeSnapshots(result, {
      ...deterministicSnapshotTarget,
      outputDir,
      actionsHash: hashIndexedActions(actions),
    });

    const files = await listFiles(outputDir);
    assert.deepEqual(files, [
      "leaderboard.json",
      "manifest.json",
      "stats.json",
      `users/${ADDR_A}.json`,
    ]);

    const leaderboard = await readJson<{ metadata: { generatedAt: string; chainId: number; finalizedBlockNumber: number }; totalUsers: number; totalDistributedPoints: string }>(
      join(outputDir, "leaderboard.json"),
    );
    const userSnapshot = await readJson<{ rank: number; questCompletions: unknown[] }>(join(outputDir, "users", `${ADDR_A}.json`));

    assert.equal(snapshot.manifest.actionsHash, hashIndexedActions(actions));
    assert.equal(leaderboard.metadata.generatedAt, deterministicSnapshotTarget.generatedAt);
    assert.equal(leaderboard.metadata.chainId, deterministicSnapshotTarget.chainId);
    assert.equal(leaderboard.metadata.finalizedBlockNumber, deterministicSnapshotTarget.finalizedBlockNumber);
    assert.equal(leaderboard.totalUsers, 1);
    assert.equal(typeof leaderboard.totalDistributedPoints, "string");
    assert.equal(userSnapshot.rank, 1);
    assert.equal(userSnapshot.questCompletions.length, 2);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("serializes bigint point totals as strings", async () => {
  const outputDir = await makeTempDir();

  try {
    const actions = [makeAction()];
    const result = applyPoints(actions);
    await writeSnapshots(result, {
      ...deterministicSnapshotTarget,
      outputDir,
      actionsHash: hashIndexedActions(actions),
    });

    const leaderboard = await readJson<{ totalDistributedPoints: unknown; users: { totalPoints: unknown }[] }>(
      join(outputDir, "leaderboard.json"),
    );
    const userSnapshot = await readJson<{ user: { totalPoints: unknown } }>(join(outputDir, "users", `${ADDR_A}.json`));

    assert.equal(typeof leaderboard.totalDistributedPoints, "string");
    assert.equal(typeof leaderboard.users[0]?.totalPoints, "string");
    assert.equal(typeof userSnapshot.user.totalPoints, "string");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("requires deterministic export metadata", async () => {
  const outputDir = await makeTempDir();
  const actions = [makeAction()];
  const result = applyPoints(actions);

  try {
    await assert.rejects(
      () =>
        writeSnapshots(result, {
          ...deterministicSnapshotTarget,
          outputDir,
          generatedAt: "",
          actionsHash: hashIndexedActions(actions),
        }),
      /generatedAt/,
    );
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("writes byte-identical snapshots for the same input and metadata", async () => {
  const outputA = await makeTempDir();
  const outputB = await makeTempDir();
  const actions = [
    makeAction({ transactionHash: "0xtx1", logIndex: 1 }),
    makeAction({ transactionHash: "0xtx2", logIndex: 2, questId: "saver_first_reward_claim", repeatableActionId: "claim_rewards" }),
  ];
  const result = applyPoints(actions);
  const target = {
    ...deterministicSnapshotTarget,
    actionsHash: hashIndexedActions(actions),
  };

  try {
    await writeSnapshots(result, { ...target, outputDir: outputA });
    await writeSnapshots(result, { ...target, outputDir: outputB });

    const filesA = await listFiles(outputA);
    const filesB = await listFiles(outputB);

    assert.deepEqual(filesA, filesB);
    await Promise.all(
      filesA.map(async file => {
        assert.equal(await hashFile(join(outputA, file)), await hashFile(join(outputB, file)), file);
      }),
    );
    assert.equal(await hashDirectory(outputA), await hashDirectory(outputB));
  } finally {
    await rm(outputA, { recursive: true, force: true });
    await rm(outputB, { recursive: true, force: true });
  }
});

test("writes deterministic snapshots independent of input action order", async () => {
  const outputA = await makeTempDir();
  const outputB = await makeTempDir();
  const actions = [
    makeAction({ transactionHash: "0xtx1", logIndex: 1, userAddress: ADDR_A, questId: "saver_first_shield" }),
    makeAction({ transactionHash: "0xtx2", logIndex: 2, userAddress: ADDR_B, questId: "protector_first_protection" }),
    makeAction({ transactionHash: "0xtx3", logIndex: 3, userAddress: ADDR_A, questId: "saver_first_reward_claim" }),
  ];
  const reversedActions = [...actions].reverse();
  const resultA = applyPoints(actions);
  const resultB = applyPoints(reversedActions);
  const target = {
    ...deterministicSnapshotTarget,
    actionsHash: hashIndexedActions(actions),
  };

  try {
    await writeSnapshots(resultA, { ...target, outputDir: outputA });
    await writeSnapshots(resultB, { ...target, outputDir: outputB });

    assert.equal(hashIndexedActions(actions), hashIndexedActions(reversedActions));
    assert.equal(await hashDirectory(outputA), await hashDirectory(outputB));
  } finally {
    await rm(outputA, { recursive: true, force: true });
    await rm(outputB, { recursive: true, force: true });
  }
});

test("manifest file hashes match emitted snapshot bytes", async () => {
  const outputDir = await makeTempDir();
  const actions = [makeAction()];
  const result = applyPoints(actions);

  try {
    const snapshot = await writeSnapshots(result, {
      ...deterministicSnapshotTarget,
      outputDir,
      actionsHash: hashIndexedActions(actions),
    });

    assert.equal(snapshot.manifest.format, "yieldshield-lite/points-snapshot-manifest");
    assert.equal(snapshot.manifest.schemaVersion, 1);
    assert.equal(snapshot.manifest.chainId, deterministicSnapshotTarget.chainId);
    assert.equal(snapshot.manifest.rulesVersion, deterministicSnapshotTarget.rulesVersion);

    for (const file of snapshot.manifest.files) {
      const body = await readFile(join(outputDir, file.path));
      assert.equal(createHash("sha256").update(body).digest("hex"), file.sha256);
      assert.equal(body.byteLength, file.bytes);
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
