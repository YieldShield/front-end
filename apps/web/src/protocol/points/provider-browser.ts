import type { PointsProvider, UserPointsSnapshot } from "./types";
import { fetchBrowserWalletPointsSnapshot } from "./browser-log-scanner";

type BrowserPointsProviderOptions = {
  chainId?: number;
  fromBlock?: number;
  finalityConfirmations?: number;
  blockChunkSize?: number;
  poolAddressChunkSize?: number;
  scanTimeoutMs?: number;
  cache?: boolean;
};

const DEFAULT_BROWSER_SCAN_TIMEOUT_MS = 45_000;

function getScanTimeoutMs(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_BROWSER_SCAN_TIMEOUT_MS;
}

function withScanTimeout<T>(promise: Promise<T>, timeoutMs: number, userAddress: string) {
  if (timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Browser points scan timed out after ${timeoutMs}ms for ${userAddress}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export function createBrowserPointsProvider(options: BrowserPointsProviderOptions = {}): PointsProvider {
  const userSnapshotPromises = new Map<string, Promise<UserPointsSnapshot | null>>();

  function getUserSnapshotPromise(userAddress: string) {
    const normalizedAddress = userAddress.toLowerCase();
    const existing = userSnapshotPromises.get(normalizedAddress);
    if (existing) {
      return existing;
    }

    const promise = withScanTimeout(
      fetchBrowserWalletPointsSnapshot(normalizedAddress, options),
      getScanTimeoutMs(options.scanTimeoutMs),
      normalizedAddress,
    );
    userSnapshotPromises.set(normalizedAddress, promise);

    void promise.then(
      () => {
        if (userSnapshotPromises.get(normalizedAddress) === promise) {
          userSnapshotPromises.delete(normalizedAddress);
        }
      },
      () => {
        if (userSnapshotPromises.get(normalizedAddress) === promise) {
          userSnapshotPromises.delete(normalizedAddress);
        }
      },
    );

    return promise;
  }

  return {
    async fetchTopUsers() {
      return [];
    },
    async fetchGlobalStats() {
      return {
        totalUsers: 0,
        totalDistributedPoints: 0n,
      };
    },
    async fetchUserSnapshot(userAddress: string) {
      return getUserSnapshotPromise(userAddress);
    },
    async fetchUserPoints(userAddress: string) {
      const snapshot = await getUserSnapshotPromise(userAddress);
      return snapshot?.user ?? null;
    },
    async fetchUserQuestProgress(userAddress: string) {
      const snapshot = await getUserSnapshotPromise(userAddress);
      return snapshot?.questCompletions ?? [];
    },
    async fetchUserStreak(userAddress: string) {
      const snapshot = await getUserSnapshotPromise(userAddress);
      return snapshot?.streak ?? null;
    },
    async fetchUserRank() {
      return null;
    },
    isConfigured() {
      return true;
    },
  };
}
