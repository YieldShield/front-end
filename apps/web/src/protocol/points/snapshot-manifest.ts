import type {
  PointsSnapshotFilePath,
  PointsSnapshotManifest,
  PointsSnapshotManifestFile,
} from "@yieldshield-lite/points-core";
import type { Address, Hex } from "viem";
import { verifyMessage } from "viem";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export type ManifestValidationOptions = {
  expectedChainId?: number;
  expectedManifestHash?: string;
  allowedSigners?: string[];
  signatureThreshold?: number;
};

export type ManifestValidationResult = {
  manifest: PointsSnapshotManifest;
  files: Map<PointsSnapshotFilePath, PointsSnapshotManifestFile>;
};

export async function sha256Hex(body: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is not available for points snapshot validation");
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function stripHexPrefix(value: string) {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function assertManifestShape(value: unknown): asserts value is PointsSnapshotManifest {
  const manifest = value as Partial<PointsSnapshotManifest> | null;
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Points snapshot manifest is not an object");
  }

  if (manifest.format !== "yieldshield-lite/points-snapshot-manifest") {
    throw new Error("Unsupported points snapshot manifest format");
  }

  if (manifest.schemaVersion !== 1 || manifest.snapshotVersion !== 1) {
    throw new Error("Unsupported points snapshot manifest version");
  }

  if (manifest.source !== "sqd") {
    throw new Error("Unsupported points snapshot manifest source");
  }

  if (!Array.isArray(manifest.files)) {
    throw new Error("Points snapshot manifest files must be an array");
  }
}

function validateFileEntry(file: PointsSnapshotManifestFile) {
  if (!file.path || file.path.startsWith("/") || file.path.includes("..")) {
    throw new Error(`Invalid points snapshot file path: ${file.path}`);
  }

  if (!SHA256_HEX_PATTERN.test(file.sha256)) {
    throw new Error(`Invalid SHA-256 hash for points snapshot file: ${file.path}`);
  }

  if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) {
    throw new Error(`Invalid byte length for points snapshot file: ${file.path}`);
  }

  if (file.contentType !== "application/json") {
    throw new Error(`Unsupported points snapshot content type for ${file.path}`);
  }
}

function createFileMap(manifest: PointsSnapshotManifest) {
  const files = new Map<PointsSnapshotFilePath, PointsSnapshotManifestFile>();

  for (const file of manifest.files) {
    validateFileEntry(file);

    if (files.has(file.path)) {
      throw new Error(`Duplicate points snapshot manifest file: ${file.path}`);
    }

    files.set(file.path, file);
  }

  for (const requiredPath of ["leaderboard.json", "stats.json"] as const) {
    if (!files.has(requiredPath)) {
      throw new Error(`Points snapshot manifest is missing ${requiredPath}`);
    }
  }

  return files;
}

export function createManifestSignatureMessage(manifest: PointsSnapshotManifest) {
  const files = [...manifest.files]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(file => `${file.path}:${file.sha256}:${file.bytes}`)
    .join("|");

  return [
    "YieldShield Lite points snapshot",
    `chainId:${manifest.chainId}`,
    `fromBlock:${manifest.fromBlock}`,
    `finalizedBlockNumber:${manifest.finalizedBlockNumber}`,
    `finalizedBlockTimestamp:${manifest.finalizedBlockTimestamp}`,
    `rulesVersion:${manifest.rulesVersion}`,
    `exporterVersion:${manifest.exporterVersion}`,
    `actionsHash:${manifest.actionsHash}`,
    `files:${files}`,
  ].join("\n");
}

async function validateManifestSignatures(manifest: PointsSnapshotManifest, options: ManifestValidationOptions) {
  const allowedSigners = new Set((options.allowedSigners ?? []).map(signer => signer.toLowerCase()));
  const threshold = options.signatureThreshold ?? 0;

  if (!allowedSigners.size || threshold <= 0) {
    return;
  }

  const message = createManifestSignatureMessage(manifest);
  const validSigners = new Set<string>();

  for (const signature of manifest.runnerSignatures) {
    const signer = signature.signer.toLowerCase();
    if (!allowedSigners.has(signer)) {
      continue;
    }

    const isValid = await verifyMessage({
      address: signer as Address,
      message,
      signature: signature.signature as Hex,
    });

    if (isValid) {
      validSigners.add(signer);
    }
  }

  if (validSigners.size < threshold) {
    throw new Error(`Points snapshot manifest has ${validSigners.size} valid signatures, expected ${threshold}`);
  }
}

export async function validateManifestText(
  body: string,
  options: ManifestValidationOptions = {},
): Promise<ManifestValidationResult> {
  const manifestHash = await sha256Hex(body);
  const expectedManifestHash = options.expectedManifestHash ? stripHexPrefix(options.expectedManifestHash).toLowerCase() : "";

  if (expectedManifestHash && manifestHash !== expectedManifestHash) {
    throw new Error("Points snapshot manifest hash does not match registry pointer");
  }

  const parsed = JSON.parse(body) as unknown;
  assertManifestShape(parsed);

  if (options.expectedChainId !== undefined && parsed.chainId !== options.expectedChainId) {
    throw new Error(`Points snapshot chain mismatch: expected ${options.expectedChainId}, got ${parsed.chainId}`);
  }

  const files = createFileMap(parsed);
  await validateManifestSignatures(parsed, options);

  return {
    manifest: parsed,
    files,
  };
}
