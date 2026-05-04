import { describe, expect, it } from "vitest";
import type { PointsSnapshotManifest } from "@yieldshield-lite/points-core";
import { privateKeyToAccount } from "viem/accounts";
import { createManifestSignatureMessage, validateManifestText } from "./snapshot-manifest";

const signerOne = privateKeyToAccount("0x59c6995e998f97a5a004497e5da4e15f9ce4bf3a4cae8c3fdb7a3f824a2e6f28");
const signerTwo = privateKeyToAccount("0x8b3a350cf5c34c9194ca3a545dcb5e3bc9342babc41a05723c1c7e5f6e4d1d95");

function createManifest(): PointsSnapshotManifest {
  return {
    format: "yieldshield-lite/points-snapshot-manifest",
    schemaVersion: 1,
    snapshotVersion: 1,
    chainId: 421614,
    source: "sqd",
    fromBlock: 1,
    finalizedBlockNumber: 2,
    finalizedBlockTimestamp: "2026-04-13T00:00:00.000Z",
    generatedAt: "2026-04-13T00:00:00.000Z",
    rulesVersion: "test",
    exporterVersion: "test",
    actionsHash: "a".repeat(64),
    files: [
      {
        path: "leaderboard.json",
        sha256: "b".repeat(64),
        bytes: 1,
        contentType: "application/json",
      },
      {
        path: "stats.json",
        sha256: "c".repeat(64),
        bytes: 1,
        contentType: "application/json",
      },
    ],
    runnerSignatures: [],
  };
}

async function signManifest(manifest: PointsSnapshotManifest, signer: typeof signerOne) {
  return {
    signer: signer.address,
    signature: await signer.signMessage({ message: createManifestSignatureMessage(manifest) }),
    signedAt: "2026-04-13T00:00:00.000Z",
  };
}

describe("validateManifestText", () => {
  it("rejects a manifest for the wrong chain", async () => {
    const manifest = createManifest();

    await expect(validateManifestText(JSON.stringify(manifest), { expectedChainId: 1 })).rejects.toThrow(
      "Points snapshot chain mismatch: expected 1, got 421614",
    );
  });

  it("rejects a manifest whose hash does not match the expected pointer", async () => {
    const manifest = createManifest();

    await expect(
      validateManifestText(JSON.stringify(manifest), {
        expectedManifestHash: `0x${"0".repeat(64)}`,
      }),
    ).rejects.toThrow("Points snapshot manifest hash does not match registry pointer");
  });

  it("counts unique valid signers toward the signature threshold", async () => {
    const manifest = createManifest();
    const signatureOne = await signManifest(manifest, signerOne);
    const signatureTwo = await signManifest(manifest, signerTwo);

    await expect(
      validateManifestText(
        JSON.stringify({
          ...manifest,
          runnerSignatures: [signatureOne, signatureOne],
        }),
        {
          allowedSigners: [signerOne.address, signerTwo.address],
          signatureThreshold: 2,
        },
      ),
    ).rejects.toThrow("Points snapshot manifest has 1 valid signatures, expected 2");

    await expect(
      validateManifestText(
        JSON.stringify({
          ...manifest,
          runnerSignatures: [signatureOne, signatureTwo],
        }),
        {
          allowedSigners: [signerOne.address, signerTwo.address],
          signatureThreshold: 2,
        },
      ),
    ).resolves.toMatchObject({
      manifest: {
        runnerSignatures: [signatureOne, signatureTwo],
      },
    });
  });

  it("rejects duplicate file paths", async () => {
    const manifest = createManifest();

    await expect(
      validateManifestText(
        JSON.stringify({
          ...manifest,
          files: [...manifest.files, manifest.files[0]],
        }),
      ),
    ).rejects.toThrow("Duplicate points snapshot manifest file: leaderboard.json");
  });

  it("rejects manifests missing required files", async () => {
    const manifest = createManifest();

    await expect(
      validateManifestText(
        JSON.stringify({
          ...manifest,
          files: manifest.files.filter(file => file.path !== "leaderboard.json"),
        }),
      ),
    ).rejects.toThrow("Points snapshot manifest is missing leaderboard.json");
  });

  it("rejects unsafe file paths", async () => {
    const manifest = createManifest();

    await expect(
      validateManifestText(
        JSON.stringify({
          ...manifest,
          files: [
            {
              ...manifest.files[0],
              path: "../leaderboard.json",
            },
            manifest.files[1],
          ],
        }),
      ),
    ).rejects.toThrow("Invalid points snapshot file path: ../leaderboard.json");
  });
});
