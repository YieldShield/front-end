import type { Address } from "viem";
import { POINTS_RULES_VERSION, type IndexedAction } from "@yieldshield-lite/points-core";

const CACHE_VERSION = "browser-wallet-v1";
const STORAGE_PREFIX = "yieldshield-lite:points-browser";

export type BrowserWalletPointsCacheKeyParams = {
  chainId: number;
  factoryAddress: Address;
  fromBlock: number;
  userAddress: Address;
};

export type BrowserWalletPointsCache = {
  version: typeof CACHE_VERSION;
  rulesVersion: typeof POINTS_RULES_VERSION;
  chainId: number;
  factoryAddress: Address;
  fromBlock: number;
  userAddress: Address;
  scannedToBlock: number;
  poolAddresses: Address[];
  actions: IndexedAction[];
};

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getBrowserWalletPointsCacheKey(params: BrowserWalletPointsCacheKeyParams) {
  return [
    STORAGE_PREFIX,
    CACHE_VERSION,
    POINTS_RULES_VERSION,
    params.chainId,
    params.factoryAddress.toLowerCase(),
    params.fromBlock,
    params.userAddress.toLowerCase(),
  ].join(":");
}

function isCacheShape(value: unknown): value is BrowserWalletPointsCache {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BrowserWalletPointsCache>;
  return (
    candidate.version === CACHE_VERSION &&
    candidate.rulesVersion === POINTS_RULES_VERSION &&
    typeof candidate.chainId === "number" &&
    typeof candidate.factoryAddress === "string" &&
    typeof candidate.fromBlock === "number" &&
    typeof candidate.userAddress === "string" &&
    typeof candidate.scannedToBlock === "number" &&
    Array.isArray(candidate.poolAddresses) &&
    Array.isArray(candidate.actions)
  );
}

export function readBrowserWalletPointsCache(key: string) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return isCacheShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBrowserWalletPointsCache(key: string, cache: BrowserWalletPointsCache) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(cache));
  } catch {
    // Storage can be full or disabled; points still work without persistence.
  }
}
