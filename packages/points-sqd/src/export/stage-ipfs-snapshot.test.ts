import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { applyPoints } from "../compute/apply-points.js";
import { ADDR_A, deterministicSnapshotTarget, makeAction } from "../test/fixtures.js";
import { hashIndexedActions, writeSnapshots } from "./write-snapshots.js";
import { stageSnapshotForIpfs } from "./stage-ipfs-snapshot.js";

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "yieldshield-points-"));
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

test("stages only manifest-listed snapshot files for IPFS publishing", async () => {
  const outputDir = await makeTempDir();
  const actions = [makeAction()];
  const result = applyPoints(actions);

  try {
    await writeSnapshots(result, {
      ...deterministicSnapshotTarget,
      outputDir,
      actionsHash: hashIndexedActions(actions),
    });
    await writeFile(join(outputDir, "stale-top-level.json"), "{}\n", "utf8");
    await writeFile(join(outputDir, "users", "stale-user.json"), "{}\n", "utf8");

    const staged = await stageSnapshotForIpfs(outputDir);

    try {
      assert.deepEqual(await listFiles(staged.stagingDir), [
        "leaderboard.json",
        "manifest.json",
        "stats.json",
        `users/${ADDR_A}.json`,
      ]);
    } finally {
      await staged.cleanup();
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("rejects manifest-listed files whose bytes no longer match the manifest", async () => {
  const outputDir = await makeTempDir();
  const actions = [makeAction()];
  const result = applyPoints(actions);

  try {
    await writeSnapshots(result, {
      ...deterministicSnapshotTarget,
      outputDir,
      actionsHash: hashIndexedActions(actions),
    });
    await writeFile(join(outputDir, "leaderboard.json"), `${await readFile(join(outputDir, "leaderboard.json"), "utf8")}\n`, "utf8");

    await assert.rejects(() => stageSnapshotForIpfs(outputDir), /leaderboard\.json/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
