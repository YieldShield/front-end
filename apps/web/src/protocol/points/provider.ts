import { appEnv } from "../../config/env";
import { getDefaultProtocolChain } from "../networks";
import { createBrowserPointsProvider } from "./provider-browser";
import { createGraphqlPointsProvider } from "./provider-graphql";
import { createSnapshotPointsProvider } from "./provider-snapshot";
import type { PointsProvider } from "./types";

const graphqlProvider = createGraphqlPointsProvider({
  endpoint: appEnv.pointsGraphqlUrl,
});

const defaultProtocolChain = getDefaultProtocolChain();
const expectedSnapshotChainId = appEnv.pointsSnapshotExpectedChainId ?? defaultProtocolChain.id;

const snapshotProvider = createSnapshotPointsProvider({
  baseUrl: appEnv.pointsSnapshotBaseUrl,
  manifestUrl: appEnv.pointsSnapshotManifestUrl,
  cid: appEnv.pointsSnapshotCid,
  gateways: appEnv.pointsSnapshotGateways,
  dnslinkName: appEnv.pointsSnapshotDnslinkName,
  dnslinkGateways: appEnv.pointsSnapshotDnslinkGateways,
  expectedChainId: expectedSnapshotChainId,
  verifyHashes: appEnv.pointsSnapshotVerifyHashes,
  registryAddress: appEnv.pointsSnapshotRegistryAddress,
  registryChainId: appEnv.pointsSnapshotRegistryChainId ?? expectedSnapshotChainId,
  allowedSigners: appEnv.pointsSnapshotAllowedSigners,
  signatureThreshold: appEnv.pointsSnapshotSignatureThreshold,
});

const browserProvider = createBrowserPointsProvider({
  chainId: defaultProtocolChain.id,
  fromBlock: appEnv.pointsBrowserFromBlock,
  finalityConfirmations: appEnv.pointsBrowserFinalityConfirmations,
  blockChunkSize: appEnv.pointsBrowserBlockChunkSize,
  poolAddressChunkSize: appEnv.pointsBrowserPoolAddressChunkSize,
  scanTimeoutMs: appEnv.pointsBrowserScanTimeoutMs,
  cache: appEnv.pointsBrowserCache,
});

const emptyProvider: PointsProvider = {
  async fetchTopUsers() {
    return [];
  },
  async fetchGlobalStats() {
    return {
      totalUsers: 0,
      totalDistributedPoints: 0n,
    };
  },
  async fetchUserSnapshot() {
    return null;
  },
  async fetchUserPoints() {
    return null;
  },
  async fetchUserQuestProgress() {
    return [];
  },
  async fetchUserStreak() {
    return null;
  },
  async fetchUserRank() {
    return null;
  },
  isConfigured() {
    return false;
  },
};

function getGlobalPointsProvider() {
  if (snapshotProvider.isConfigured()) {
    return snapshotProvider;
  }

  if (graphqlProvider.isConfigured()) {
    return graphqlProvider;
  }

  return emptyProvider;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchBrowserUserSnapshotWithFallback(userAddress: string) {
  try {
    return await browserProvider.fetchUserSnapshot(userAddress);
  } catch (error) {
    const globalPointsProvider = getGlobalPointsProvider();

    if (!globalPointsProvider.isConfigured()) {
      throw error;
    }

    console.warn(`Browser points scan failed; using configured points fallback: ${getErrorMessage(error)}`);
    return globalPointsProvider.fetchUserSnapshot(userAddress);
  }
}

const browserWithFallbackProvider: PointsProvider = {
  async fetchTopUsers(limit = 20) {
    return getGlobalPointsProvider().fetchTopUsers(limit);
  },
  async fetchGlobalStats() {
    return getGlobalPointsProvider().fetchGlobalStats();
  },
  async fetchUserSnapshot(userAddress: string) {
    return fetchBrowserUserSnapshotWithFallback(userAddress);
  },
  async fetchUserPoints(userAddress: string) {
    const snapshot = await fetchBrowserUserSnapshotWithFallback(userAddress);
    return snapshot?.user ?? null;
  },
  async fetchUserQuestProgress(userAddress: string) {
    const snapshot = await fetchBrowserUserSnapshotWithFallback(userAddress);
    return snapshot?.questCompletions ?? [];
  },
  async fetchUserStreak(userAddress: string) {
    const snapshot = await fetchBrowserUserSnapshotWithFallback(userAddress);
    return snapshot?.streak ?? null;
  },
  async fetchUserRank(userAddress: string) {
    return getGlobalPointsProvider().fetchUserRank(userAddress);
  },
  isConfigured() {
    return true;
  },
};

export function getPointsProvider(): PointsProvider {
  if (appEnv.pointsProvider === "snapshot") {
    return snapshotProvider.isConfigured() ? snapshotProvider : emptyProvider;
  }

  if (appEnv.pointsProvider === "graphql") {
    return graphqlProvider.isConfigured() ? graphqlProvider : emptyProvider;
  }

  if (appEnv.pointsProvider === "browser" || appEnv.pointsProvider === "auto" || !appEnv.pointsProvider) {
    return browserWithFallbackProvider;
  }

  return browserWithFallbackProvider;
}

export function isGlobalPointsProviderConfigured() {
  return getGlobalPointsProvider().isConfigured();
}
