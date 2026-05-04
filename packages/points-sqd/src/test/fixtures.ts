import type { IndexedAction } from "../model/types.js";

export const ADDR_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const ADDR_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
export const ADDR_C = "0xcccccccccccccccccccccccccccccccccccccccc";
export const POOL = "0x1111111111111111111111111111111111111111";
export const ASSET = "0x2222222222222222222222222222222222222222";

export const deterministicSnapshotTarget = {
  chainId: 421614,
  fromBlock: 100,
  finalizedBlockNumber: 123456,
  finalizedBlockTimestamp: "2026-04-01T00:00:00.000Z",
  generatedAt: "2026-04-01T00:00:00.000Z",
  rulesVersion: "yieldshield-lite-points-v1",
  exporterVersion: "0.1.0",
};

export function makeAction(overrides: Partial<IndexedAction> = {}): IndexedAction {
  const logIndex = overrides.logIndex ?? 0;
  const transactionHash = overrides.transactionHash ?? "0xtx";

  return {
    id: `${transactionHash}:${logIndex}:test`,
    chainId: 421614,
    contractName: "SplitRiskPool",
    contractAddress: POOL,
    eventName: "ShieldedAssetDeposited",
    blockNumber: 100,
    transactionHash,
    logIndex,
    userAddress: ADDR_A,
    poolAddress: POOL,
    assetAddress: ASSET,
    amount: "1000",
    action: "saver_deposit",
    occurredAt: "2026-04-01T00:00:00.000Z",
    questId: "saver_first_shield",
    repeatableActionId: "saver_deposit",
    ...overrides,
  };
}
