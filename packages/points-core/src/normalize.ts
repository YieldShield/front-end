import type { IndexedAction, IndexedActionMetadata, NormalizedLogContext } from "./types";

export function normalizeAddress(value: string | null | undefined) {
  return value ? value.toLowerCase() : undefined;
}

export function toNumber(value: bigint | number | string) {
  return typeof value === "number" ? value : Number(value);
}

export function toStringValue(value: bigint | number | string) {
  return typeof value === "string" ? value : value.toString();
}

export function toIsoTimestamp(timestampSeconds: bigint | number | string) {
  const seconds = typeof timestampSeconds === "number" ? timestampSeconds : Number(timestampSeconds);
  return new Date(seconds * 1000).toISOString();
}

export function buildActionId(context: NormalizedLogContext, suffix: string) {
  return `${context.transactionHash}:${toStringValue(context.logIndex)}:${suffix}`;
}

export function createIndexedAction(
  context: NormalizedLogContext,
  params: Omit<IndexedAction, "id" | "chainId" | "contractAddress" | "blockNumber" | "logIndex" | "transactionHash" | "occurredAt"> & {
    suffix: string;
    metadata?: IndexedActionMetadata;
  },
): IndexedAction {
  return {
    id: buildActionId(context, params.suffix),
    chainId: context.chainId,
    contractAddress: normalizeAddress(context.contractAddress) ?? context.contractAddress,
    blockNumber: toNumber(context.blockNumber),
    transactionHash: context.transactionHash,
    logIndex: toNumber(context.logIndex),
    occurredAt: toIsoTimestamp(context.blockTimestamp),
    contractName: params.contractName,
    eventName: params.eventName,
    action: params.action,
    userAddress: normalizeAddress(params.userAddress),
    poolAddress: normalizeAddress(params.poolAddress),
    assetAddress: normalizeAddress(params.assetAddress),
    amount: params.amount,
    questId: params.questId ?? null,
    repeatableActionId: params.repeatableActionId ?? null,
    metadata: params.metadata,
  };
}
