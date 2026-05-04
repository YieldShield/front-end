import type {
  PointsLeaderboardSnapshot,
  PointsProvider,
  PointsSnapshotFilePath,
  PointsSnapshotManifest,
  PointsStatsSnapshot,
  UserPointsSnapshot,
} from "./types";
import { fetchSnapshotRegistryPointer, type PointsSnapshotRegistryPointer } from "./registry";
import { sha256Hex, validateManifestText, type ManifestValidationResult } from "./snapshot-manifest";
import {
  getDnslinkGatewayBaseUrls,
  getIpfsGatewayBaseUrls,
  getManifestUrlDirectory,
  getSnapshotSources,
  joinSnapshotUrl,
  type SnapshotUrlSource,
} from "./snapshot-urls";

type SnapshotPointsProviderOptions = {
  baseUrl?: string;
  manifestUrl?: string;
  cid?: string;
  gateways?: string[];
  dnslinkName?: string;
  dnslinkGateways?: string[];
  expectedChainId?: number;
  verifyHashes?: boolean;
  registryAddress?: string;
  registryChainId?: number;
  allowedSigners?: string[];
  signatureThreshold?: number;
};

type SnapshotContext = {
  manifest: PointsSnapshotManifest | null;
  validation: ManifestValidationResult | null;
  baseUrls: string[];
};

type FetchTextResult = {
  text: string;
  url: string;
};

async function fetchTextFromUrls(urls: string[], allow404 = false): Promise<FetchTextResult | null> {
  const errors: Error[] = [];
  let saw404 = false;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 404) {
        saw404 = true;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Points snapshot query failed with ${response.status} for ${url}`);
      }

      return {
        text: await response.text(),
        url,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (allow404 && saw404) {
    return null;
  }

  throw errors[0] ?? new Error(`Points snapshot file not found: ${urls.join(", ")}`);
}

function getBaseUrlsForSource(source: SnapshotUrlSource) {
  switch (source.kind) {
    case "base":
      return [source.baseUrl];
    case "manifest":
      return [getManifestUrlDirectory(source.manifestUrl)];
    case "cid":
      return getIpfsGatewayBaseUrls(source.cid, source.gateways);
    case "dnslink":
      return getDnslinkGatewayBaseUrls(source.name, source.gateways);
  }
}

async function fetchManifestForSource(
  source: SnapshotUrlSource,
  options: SnapshotPointsProviderOptions,
  registryPointer: PointsSnapshotRegistryPointer | null,
) {
  const baseUrls = getBaseUrlsForSource(source);
  const manifestUrls = source.kind === "manifest" ? [source.manifestUrl] : baseUrls.map(baseUrl => joinSnapshotUrl(baseUrl, "manifest.json"));
  const manifestResult = await fetchTextFromUrls(manifestUrls, source.kind === "base");

  if (!manifestResult) {
    return {
      manifest: null,
      validation: null,
      baseUrls,
    } satisfies SnapshotContext;
  }

  if (registryPointer && registryPointer.schemaVersion !== 1) {
    throw new Error(`Unsupported points snapshot registry schema version: ${registryPointer.schemaVersion}`);
  }

  const validation = await validateManifestText(manifestResult.text, {
    expectedChainId: options.expectedChainId,
    expectedManifestHash: registryPointer?.manifestHash,
    allowedSigners: options.allowedSigners,
    signatureThreshold: options.signatureThreshold,
  });

  return {
    manifest: validation.manifest,
    validation,
    baseUrls,
  } satisfies SnapshotContext;
}

async function resolveRegistryPointer(options: SnapshotPointsProviderOptions) {
  if (!options.registryAddress || !options.registryChainId) {
    return null;
  }

  try {
    return await fetchSnapshotRegistryPointer({
      address: options.registryAddress,
      chainId: options.registryChainId,
    });
  } catch (error) {
    console.warn("Failed to resolve points snapshot registry pointer", error);
    return null;
  }
}

function getSnapshotFileUrls(context: SnapshotContext, path: string) {
  return context.baseUrls.map(baseUrl => joinSnapshotUrl(baseUrl, path));
}

async function parseSnapshotFile<T>(context: SnapshotContext, path: string, text: string, verifyHashes: boolean) {
  const file = context.validation?.files.get(path as PointsSnapshotFilePath);

  if (file && verifyHashes) {
    const actualHash = await sha256Hex(text);
    const actualBytes = new TextEncoder().encode(text).byteLength;

    if (actualHash !== file.sha256) {
      throw new Error(`Points snapshot hash mismatch for ${path}`);
    }

    if (actualBytes !== file.bytes) {
      throw new Error(`Points snapshot byte length mismatch for ${path}`);
    }
  }

  return JSON.parse(text) as T;
}

export function createSnapshotPointsProvider(options: SnapshotPointsProviderOptions): PointsProvider {
  let contextPromise: Promise<SnapshotContext | null> | null = null;

  async function resolveSnapshotContext() {
    if (contextPromise) {
      return contextPromise;
    }

    contextPromise = (async () => {
      const registryPointer = await resolveRegistryPointer(options);
      const sources = getSnapshotSources({
        registryCid: registryPointer?.cid,
        manifestUrl: options.manifestUrl,
        dnslinkName: options.dnslinkName,
        dnslinkGateways: options.dnslinkGateways,
        cid: options.cid,
        gateways: options.gateways,
        baseUrl: options.baseUrl,
      });
      let lastError: Error | null = null;

      for (const source of sources) {
        try {
          return await fetchManifestForSource(source, options, source.kind === "cid" && registryPointer?.cid === source.cid ? registryPointer : null);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (lastError) {
        throw lastError;
      }

      return null;
    })();

    const promise = contextPromise;
    void promise.catch(() => {
      if (contextPromise === promise) {
        contextPromise = null;
      }
    });

    return contextPromise;
  }

  async function fetchSnapshot<T>(path: string, allow404 = false) {
    const context = await resolveSnapshotContext();
    if (!context) {
      return null;
    }

    if (context.validation && !context.validation.files.has(path as PointsSnapshotFilePath)) {
      if (allow404) {
        return null;
      }

      throw new Error(`Points snapshot manifest does not list ${path}`);
    }

    const result = await fetchTextFromUrls(getSnapshotFileUrls(context, path), allow404 && !context.validation);
    if (!result) {
      return null;
    }

    return parseSnapshotFile<T>(context, path, result.text, options.verifyHashes !== false);
  }

  async function fetchLeaderboard() {
    return fetchSnapshot<PointsLeaderboardSnapshot>("leaderboard.json");
  }

  async function fetchStats() {
    return fetchSnapshot<PointsStatsSnapshot>("stats.json");
  }

  async function fetchUserSnapshot(userAddress: string) {
    return fetchSnapshot<UserPointsSnapshot>(`users/${userAddress.toLowerCase()}.json`, true);
  }

  return {
    async fetchTopUsers(limit = 20) {
      const leaderboard = await fetchLeaderboard();
      return leaderboard?.users.slice(0, limit) ?? [];
    },
    async fetchGlobalStats() {
      const stats = await fetchStats();
      return {
        totalUsers: stats?.totalUsers ?? 0,
        totalDistributedPoints: BigInt(stats?.totalDistributedPoints ?? "0"),
      };
    },
    fetchUserSnapshot,
    async fetchUserPoints(userAddress: string) {
      const snapshot = await fetchUserSnapshot(userAddress);
      return snapshot?.user ?? null;
    },
    async fetchUserQuestProgress(userAddress: string) {
      const snapshot = await fetchUserSnapshot(userAddress);
      return snapshot?.questCompletions ?? [];
    },
    async fetchUserStreak(userAddress: string) {
      const snapshot = await fetchUserSnapshot(userAddress);
      return snapshot?.streak ?? null;
    },
    async fetchUserRank(userAddress: string) {
      const snapshot = await fetchUserSnapshot(userAddress);
      return snapshot?.rank ?? null;
    },
    isConfigured() {
      return Boolean(
        options.baseUrl ||
          options.manifestUrl ||
          options.dnslinkName ||
          options.cid ||
          (options.registryAddress && options.registryChainId),
      );
    },
  };
}
