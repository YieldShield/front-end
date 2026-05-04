import { afterEach, describe, expect, it, vi } from "vitest";
import type { PointsLeaderboardSnapshot, PointsSnapshotManifest, PointsStatsSnapshot } from "./types";
import { createSnapshotPointsProvider } from "./provider-snapshot";
import { sha256Hex } from "./snapshot-manifest";

const generatedAt = "2026-04-13T00:00:00.000Z";

const manifest = {
  format: "yieldshield-lite/points-snapshot-manifest",
  schemaVersion: 1,
  snapshotVersion: 1,
  chainId: 421614,
  source: "sqd",
  fromBlock: 1,
  finalizedBlockNumber: 2,
  finalizedBlockTimestamp: generatedAt,
  generatedAt,
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
} satisfies PointsSnapshotManifest;

const leaderboard = {
  metadata: {
    format: "yieldshield-lite/points-snapshot",
    version: 1,
    generatedAt,
    chainId: 421614,
    source: "sqd",
    fromBlock: 1,
    finalizedBlockNumber: 2,
    finalizedBlockTimestamp: generatedAt,
    rulesVersion: "test",
    exporterVersion: "test",
  },
  totalUsers: 1,
  totalDistributedPoints: "10",
  users: [
    {
      userAddress: "0x0000000000000000000000000000000000000001",
      totalPoints: "10",
      lastUpdated: generatedAt,
    },
  ],
} satisfies PointsLeaderboardSnapshot;

const stats = {
  metadata: leaderboard.metadata,
  totalUsers: 123,
  totalDistributedPoints: "456",
} satisfies PointsStatsSnapshot;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("createSnapshotPointsProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not keep a rejected snapshot context promise cached forever", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "temporary gateway failure" }, 502))
      .mockResolvedValueOnce(jsonResponse(manifest))
      .mockResolvedValueOnce(jsonResponse(leaderboard));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      baseUrl: "https://snapshots.example/points",
      expectedChainId: 421614,
      verifyHashes: false,
    });

    await expect(provider.fetchTopUsers()).rejects.toThrow("Points snapshot query failed with 502");
    await expect(provider.fetchTopUsers()).resolves.toEqual(leaderboard.users);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://snapshots.example/points/manifest.json",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://snapshots.example/points/manifest.json",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("falls back to the next DNSLink gateway for manifests and snapshot files", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "primary manifest gateway failed" }, 502))
      .mockResolvedValueOnce(jsonResponse(manifest))
      .mockResolvedValueOnce(jsonResponse({ error: "primary leaderboard gateway failed" }, 502))
      .mockResolvedValueOnce(jsonResponse(leaderboard));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      dnslinkName: "points.yieldshield.example",
      dnslinkGateways: ["https://primary.example/ipns/{name}", "https://backup.example/ipns/{dnslink}"],
      expectedChainId: 421614,
      verifyHashes: false,
    });

    await expect(provider.fetchTopUsers()).resolves.toEqual(leaderboard.users);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://primary.example/ipns/points.yieldshield.example/manifest.json",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://backup.example/ipns/points.yieldshield.example/manifest.json",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://primary.example/ipns/points.yieldshield.example/leaderboard.json",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://backup.example/ipns/points.yieldshield.example/leaderboard.json",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns null for missing user snapshots when no manifest lists per-user files", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "manifest not published yet" }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "user not found" }, 404));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      baseUrl: "https://snapshots.example/points",
      expectedChainId: 421614,
    });

    await expect(provider.fetchUserSnapshot("0x0000000000000000000000000000000000000001")).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://snapshots.example/points/users/0x0000000000000000000000000000000000000001.json",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws for missing required snapshot files", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "manifest not published yet" }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "leaderboard missing" }, 404));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      baseUrl: "https://snapshots.example/points",
      expectedChainId: 421614,
    });

    await expect(provider.fetchTopUsers()).rejects.toThrow(
      "Points snapshot file not found: https://snapshots.example/points/leaderboard.json",
    );
  });

  it("returns global stats from the stats snapshot", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(manifest))
      .mockResolvedValueOnce(jsonResponse(stats));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      baseUrl: "https://snapshots.example/points",
      expectedChainId: 421614,
      verifyHashes: false,
    });

    await expect(provider.fetchGlobalStats()).resolves.toEqual({
      totalUsers: 123,
      totalDistributedPoints: 456n,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://snapshots.example/points/stats.json",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects snapshot files whose bytes do not match the manifest", async () => {
    const leaderboardText = JSON.stringify(leaderboard);
    const leaderboardHash = await sha256Hex(leaderboardText);
    const leaderboardBytes = new TextEncoder().encode(leaderboardText).byteLength;
    const changedLeaderboardText = JSON.stringify({
      ...leaderboard,
      totalDistributedPoints: "11",
    });
    const manifestWithLeaderboardHash = {
      ...manifest,
      files: manifest.files.map(file =>
        file.path === "leaderboard.json"
          ? {
              ...file,
              sha256: leaderboardHash,
              bytes: leaderboardBytes,
            }
          : file,
      ),
    } satisfies PointsSnapshotManifest;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(manifestWithLeaderboardHash))
      .mockResolvedValueOnce(textResponse(changedLeaderboardText));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSnapshotPointsProvider({
      baseUrl: "https://snapshots.example/points",
      expectedChainId: 421614,
    });

    await expect(provider.fetchTopUsers()).rejects.toThrow("Points snapshot hash mismatch for leaderboard.json");
  });
});
