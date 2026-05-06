import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import type { PointsSnapshotManifest, PointsSnapshotManifestFile } from "@yieldshield/points-core";

export type StagedIpfsSnapshot = {
  sourceDir: string;
  stagingDir: string;
  files: string[];
  cleanup(): Promise<void>;
};

function assertSnapshotRelativePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) {
    throw new Error(`Invalid snapshot file path in manifest: ${path}`);
  }
}

function resolveSnapshotPath(rootDir: string, relativePath: string) {
  assertSnapshotRelativePath(relativePath);

  const root = resolve(rootDir);
  const resolved = resolve(root, relativePath);
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;

  if (!resolved.startsWith(rootPrefix)) {
    throw new Error(`Snapshot file escapes snapshot directory: ${relativePath}`);
  }

  return resolved;
}

async function hashSnapshotFile(path: string) {
  const body = await readFile(path);

  return {
    sha256: createHash("sha256").update(body).digest("hex"),
    bytes: body.byteLength,
  };
}

function parseManifest(body: string): PointsSnapshotManifest {
  const manifest = JSON.parse(body) as PointsSnapshotManifest;

  if (manifest.format !== "yieldshield-lite/points-snapshot-manifest") {
    throw new Error("Unsupported points snapshot manifest format");
  }

  if (!Array.isArray(manifest.files)) {
    throw new Error("Points snapshot manifest files must be an array");
  }

  return manifest;
}

async function verifyManifestFile(sourceDir: string, file: PointsSnapshotManifestFile) {
  const sourcePath = resolveSnapshotPath(sourceDir, file.path);
  const actual = await hashSnapshotFile(sourcePath);

  if (actual.sha256 !== file.sha256) {
    throw new Error(`Snapshot file hash mismatch before IPFS publish: ${file.path}`);
  }

  if (actual.bytes !== file.bytes) {
    throw new Error(`Snapshot file byte length mismatch before IPFS publish: ${file.path}`);
  }

  return sourcePath;
}

async function copyManifestFile(sourceDir: string, stagingDir: string, file: PointsSnapshotManifestFile) {
  const sourcePath = await verifyManifestFile(sourceDir, file);
  const targetPath = resolveSnapshotPath(stagingDir, file.path);

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

export async function stageSnapshotForIpfs(sourceDir: string): Promise<StagedIpfsSnapshot> {
  const resolvedSourceDir = resolve(sourceDir);
  const manifestSourcePath = join(resolvedSourceDir, "manifest.json");
  const manifestBody = await readFile(manifestSourcePath, "utf8");
  const manifest = parseManifest(manifestBody);
  const stagingDir = await mkdtemp(join(tmpdir(), "yieldshield-points-ipfs-"));
  const manifestTargetPath = join(stagingDir, "manifest.json");
  const files = ["manifest.json", ...manifest.files.map(file => file.path)].sort();

  await copyFile(manifestSourcePath, manifestTargetPath);

  try {
    for (const file of [...manifest.files].sort((left, right) => left.path.localeCompare(right.path))) {
      await copyManifestFile(resolvedSourceDir, stagingDir, file);
    }
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }

  return {
    sourceDir: resolvedSourceDir,
    stagingDir,
    files,
    cleanup() {
      return rm(stagingDir, { recursive: true, force: true });
    },
  };
}
