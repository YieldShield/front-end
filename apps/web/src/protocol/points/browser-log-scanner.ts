import {
  type Address,
  type Hex,
  decodeEventLog,
  getAddress,
  isAddress,
  numberToHex,
  padHex,
  parseAbiItem,
  toEventSelector,
} from "viem";
import {
  POINTS_RULES_VERSION,
  applyPoints,
  handleFactoryEvent,
  handlePoolEvent,
  normalizeAddress,
  toIsoTimestamp,
  type IndexedAction,
  type PoolCreatedArgs,
  type PoolEventArgsMap,
  type PoolEventName,
  type UserLedgerRow,
  type UserPoints,
  type UserPointsSnapshot,
  type UserStreakInfo,
} from "@yieldshield-lite/points-core";
import { getDefaultProtocolChain, getProtocolChainById, getProtocolReadClient } from "../networks";
import {
  getBrowserWalletPointsCacheKey,
  readBrowserWalletPointsCache,
  writeBrowserWalletPointsCache,
} from "./browser-cache";
import { getRpcResolutionForChainId, isKnownBrowserUnsafePublicRpcForChainId } from "../rpc";

const BROWSER_POINTS_EXPORTER_VERSION = "browser-wallet-v1";
const DEFAULT_FINALITY_CONFIRMATIONS = 20;
const DEFAULT_BLOCK_CHUNK_SIZE = 50_000;
const DEFAULT_POOL_ADDRESS_CHUNK_SIZE = 50;
const FALLBACK_RPC_BLOCK_CHUNK_LIMIT_BY_CHAIN_ID: Record<number, number> = {
  421614: 50_000,
};

const DEFAULT_START_BLOCK_BY_CHAIN_ID: Record<number, number> = {
  421614: 235206778,
  31337: 0,
};

const FACTORY_POOL_CREATED_EVENT = parseAbiItem(
  "event PoolCreated(address indexed poolAddress, address indexed shieldedToken, address indexed backingToken, uint256 commissionRate, uint256 poolFee, uint256 collateralRatio, address creator)",
);

const POOL_POINT_EVENTS = [
  parseAbiItem(
    "event ShieldedAssetDeposited(address indexed depositor, address indexed asset, uint256 amount, uint256 tokensIssued)",
  ),
  parseAbiItem(
    "event ProtectorAssetDeposited(address indexed depositor, address indexed asset, uint256 amount, uint256 tokensIssued)",
  ),
  parseAbiItem("event CommissionClaimed(address indexed recipient, uint256 indexed tokenId, uint256 amount)"),
  parseAbiItem("event RewardsClaimed(address indexed shieldedAddress, uint256 amount, address indexed asset)"),
  parseAbiItem("event ShieldedWithdrawal(address indexed withdrawer, uint256 amount, address preferredAsset)"),
  parseAbiItem(
    "event PartialWithdrawal(address indexed user, uint256 indexed oldTokenId, uint256 indexed newTokenId, uint256 withdrawAmount, uint256 remainingAmount)",
  ),
  parseAbiItem("event UnlockProcessStarted(address indexed protector, uint256 indexed tokenId, uint256 amount)"),
  parseAbiItem(
    "event ShieldActivated(address indexed withdrawer, uint256 amount, uint256 shieldedTokenAmount, uint256 backingTokenAmount)",
  ),
  parseAbiItem("event UnlockProcessCancelled(address indexed protector, uint256 indexed tokenId)"),
  parseAbiItem("event PoolFeePaid(address indexed creator, uint256 amount)"),
] as const;

const POOL_POINT_EVENT_TOPICS = POOL_POINT_EVENTS.map(event => toEventSelector(event));

type BrowserWalletPointsOptions = {
  chainId?: number;
  fromBlock?: number;
  finalityConfirmations?: number;
  blockChunkSize?: number;
  poolAddressChunkSize?: number;
  cache?: boolean;
};

type PointsPublicClient = ReturnType<typeof getProtocolReadClient>;

type PointsLog = {
  address: Address;
  blockNumber: number;
  transactionHash: Hex;
  logIndex: number;
  data: Hex;
  topics: [Hex, ...Hex[]];
};

type RpcLog = {
  address: Address;
  blockNumber: Hex;
  transactionHash: Hex;
  logIndex: Hex;
  data: Hex;
  topics: [Hex, ...Hex[]];
};

type BlockRange = {
  fromBlock: number;
  toBlock: number;
};

export class BrowserPointsScanUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserPointsScanUnavailableError";
  }
}

function getStartBlock(chainId: number, fromBlock?: number) {
  return fromBlock ?? DEFAULT_START_BLOCK_BY_CHAIN_ID[chainId] ?? 0;
}

function getPositiveInteger(value: number | undefined, fallback: number) {
  return value && Number.isInteger(value) && value > 0 ? value : fallback;
}

function getBlockChunkSize(chainId: number, value: number | undefined) {
  const chunkSize = getPositiveInteger(value, DEFAULT_BLOCK_CHUNK_SIZE);
  const fallbackLimit =
    getRpcResolutionForChainId(chainId).source === "fallback"
      ? FALLBACK_RPC_BLOCK_CHUNK_LIMIT_BY_CHAIN_ID[chainId]
      : undefined;

  return fallbackLimit ? Math.min(chunkSize, fallbackLimit) : chunkSize;
}

function assertBrowserPointsRpcCanScanLogs(chainId: number) {
  if (!isKnownBrowserUnsafePublicRpcForChainId(chainId)) {
    return;
  }

  throw new BrowserPointsScanUnavailableError(
    "Browser points scanning is disabled because every configured Arbitrum Sepolia RPC is known to reject browser eth_getLogs requests with CORS and rate limits. Set VITE_RPC_URL_421614 or VITE_RPC_URLS_421614 to browser-safe public RPC endpoints, or use VITE_POINTS_PROVIDER=snapshot with a configured points snapshot.",
  );
}

function* getBlockRanges(fromBlock: number, toBlock: number, chunkSize: number): Generator<BlockRange> {
  for (let current = fromBlock; current <= toBlock; current += chunkSize) {
    yield {
      fromBlock: current,
      toBlock: Math.min(current + chunkSize - 1, toBlock),
    };
  }
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function getTopicAddress(address: Address) {
  return padHex(address.toLowerCase() as Hex, { size: 32 });
}

function getRequiredLogFields(log: PointsLog) {
  return {
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
  };
}

async function fetchBlockTimestamps(client: PointsPublicClient, blockNumbers: Iterable<number>) {
  const uniqueBlockNumbers = Array.from(new Set(blockNumbers)).sort((left, right) => left - right);
  const entries = await Promise.all(
    uniqueBlockNumbers.map(async blockNumber => {
      const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
      return [blockNumber, block.timestamp] as const;
    }),
  );

  return new Map(entries);
}

async function fetchRpcLogs(
  client: PointsPublicClient,
  filter: {
    address: Address | Address[];
    topics: Array<Hex | Hex[] | null>;
    fromBlock: number;
    toBlock: number;
  },
) {
  const request = client.request as (args: { method: "eth_getLogs"; params: unknown[] }) => Promise<unknown>;
  const logs = (await request({
    method: "eth_getLogs",
    params: [
      {
        address: filter.address,
        topics: filter.topics,
        fromBlock: numberToHex(filter.fromBlock),
        toBlock: numberToHex(filter.toBlock),
      },
    ],
  })) as RpcLog[];

  return logs.map(log => ({
    address: getAddress(log.address),
    blockNumber: Number(BigInt(log.blockNumber)),
    transactionHash: log.transactionHash,
    logIndex: Number(BigInt(log.logIndex)),
    data: log.data,
    topics: log.topics,
  })) satisfies PointsLog[];
}

function createUserPoints(row: UserLedgerRow): UserPoints {
  return {
    userAddress: row.userAddress,
    totalPoints: row.totalPoints.toString(),
    lastUpdated: row.lastUpdated,
  };
}

function createUserStreak(row: UserLedgerRow): UserStreakInfo | null {
  if (!row.lastActiveDate) {
    return null;
  }

  return {
    userAddress: row.userAddress,
    currentStreak: row.currentStreak.toString(),
    lastActiveDate: row.lastActiveDate,
    longestStreak: row.longestStreak.toString(),
  };
}

function createUserSnapshot(params: {
  userAddress: Address;
  actions: IndexedAction[];
  chainId: number;
  fromBlock: number;
  finalizedBlockNumber: number;
  finalizedBlockTimestamp: bigint;
}) {
  const normalizedUserAddress = params.userAddress.toLowerCase();
  const result = applyPoints(params.actions.filter(action => action.userAddress === normalizedUserAddress));
  const row = result.users.get(normalizedUserAddress) ?? null;
  const finalizedBlockTimestampIso = toIsoTimestamp(params.finalizedBlockTimestamp);

  return {
    metadata: {
      format: "yieldshield-lite/points-snapshot",
      version: 1,
      generatedAt: finalizedBlockTimestampIso,
      chainId: params.chainId,
      source: "browser",
      fromBlock: params.fromBlock,
      finalizedBlockNumber: params.finalizedBlockNumber,
      finalizedBlockTimestamp: finalizedBlockTimestampIso,
      rulesVersion: POINTS_RULES_VERSION,
      exporterVersion: BROWSER_POINTS_EXPORTER_VERSION,
    },
    user: row ? createUserPoints(row) : null,
    rank: null,
    streak: row ? createUserStreak(row) : null,
    questCompletions: row?.questCompletions ?? [],
  } satisfies UserPointsSnapshot;
}

function decodePoolCreatedAction(params: {
  chainId: number;
  factoryAddress: Address;
  userAddress: Address;
  log: PointsLog;
  blockTimestamp: bigint;
}) {
  const decoded = decodeEventLog({
    abi: [FACTORY_POOL_CREATED_EVENT],
    data: params.log.data,
    topics: params.log.topics,
  });
  const args = decoded.args as unknown as PoolCreatedArgs;

  if (normalizeAddress(args.creator) !== params.userAddress.toLowerCase()) {
    return [];
  }

  const logFields = getRequiredLogFields(params.log);

  return handleFactoryEvent({
    eventName: "PoolCreated",
    args,
    context: {
      chainId: params.chainId,
      contractAddress: params.factoryAddress,
      blockNumber: logFields.blockNumber,
      blockTimestamp: params.blockTimestamp,
      transactionHash: logFields.transactionHash,
      logIndex: logFields.logIndex,
    },
  });
}

function decodePoolAction(params: {
  chainId: number;
  log: PointsLog;
  blockTimestamp: bigint;
}) {
  const decoded = decodeEventLog({
    abi: POOL_POINT_EVENTS,
    data: params.log.data,
    topics: params.log.topics,
  });
  const eventName = decoded.eventName as PoolEventName;
  const logFields = getRequiredLogFields(params.log);

  return handlePoolEvent({
    eventName,
    args: decoded.args as unknown as PoolEventArgsMap[typeof eventName],
    context: {
      chainId: params.chainId,
      contractAddress: params.log.address,
      blockNumber: logFields.blockNumber,
      blockTimestamp: params.blockTimestamp,
      transactionHash: logFields.transactionHash,
      logIndex: logFields.logIndex,
    },
  } as Parameters<typeof handlePoolEvent>[0]);
}

async function scanPoolCreatedLogs(params: {
  client: PointsPublicClient;
  chainId: number;
  factoryAddress: Address;
  userAddress: Address;
  ranges: BlockRange[];
}) {
  const logs: PointsLog[] = [];

  for (const range of params.ranges) {
    const rangeLogs = await fetchRpcLogs(params.client, {
      address: params.factoryAddress,
      topics: [[toEventSelector(FACTORY_POOL_CREATED_EVENT)]],
      fromBlock: range.fromBlock,
      toBlock: range.toBlock,
    });
    logs.push(...rangeLogs);
  }

  const timestamps = await fetchBlockTimestamps(
    params.client,
    logs.map(log => log.blockNumber),
  );
  const poolAddresses = new Set<Address>();
  const actions: IndexedAction[] = [];

  for (const log of logs) {
    const decoded = decodeEventLog({
      abi: [FACTORY_POOL_CREATED_EVENT],
      data: log.data,
      topics: log.topics,
    });
    const args = decoded.args as unknown as PoolCreatedArgs;

    if (isAddress(args.poolAddress)) {
      poolAddresses.add(getAddress(args.poolAddress));
    }

    const blockNumber = log.blockNumber;
    const blockTimestamp = timestamps.get(blockNumber);
    if (blockTimestamp === undefined) {
      continue;
    }

    actions.push(
      ...decodePoolCreatedAction({
        chainId: params.chainId,
        factoryAddress: params.factoryAddress,
        userAddress: params.userAddress,
        log,
        blockTimestamp,
      }),
    );
  }

  return {
    poolAddresses: Array.from(poolAddresses),
    actions,
  };
}

async function scanWalletPoolLogs(params: {
  client: PointsPublicClient;
  chainId: number;
  userAddress: Address;
  poolAddresses: Address[];
  ranges: BlockRange[];
  poolAddressChunkSize: number;
}) {
  const logs: PointsLog[] = [];
  const userTopic = getTopicAddress(params.userAddress);

  for (const poolAddressChunk of chunkArray(params.poolAddresses, params.poolAddressChunkSize)) {
    for (const range of params.ranges) {
      const rangeLogs = await fetchRpcLogs(params.client, {
        address: poolAddressChunk,
        topics: [POOL_POINT_EVENT_TOPICS, userTopic],
        fromBlock: range.fromBlock,
        toBlock: range.toBlock,
      });
      logs.push(...rangeLogs);
    }
  }

  const timestamps = await fetchBlockTimestamps(
    params.client,
    logs.map(log => log.blockNumber),
  );

  return logs.flatMap(log => {
    const blockTimestamp = timestamps.get(log.blockNumber);
    if (blockTimestamp === undefined) {
      return [];
    }

    return decodePoolAction({
      chainId: params.chainId,
      log,
      blockTimestamp,
    });
  });
}

function dedupeActions(actions: IndexedAction[]) {
  return Array.from(new Map(actions.map(action => [action.id, action])).values()).sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber - right.blockNumber;
    }

    if (left.logIndex !== right.logIndex) {
      return left.logIndex - right.logIndex;
    }

    return left.transactionHash.localeCompare(right.transactionHash);
  });
}

function dedupeAddresses(addresses: Address[]) {
  return Array.from(new Set(addresses.map(address => getAddress(address))));
}

export async function fetchBrowserWalletPointsSnapshot(userAddress: string, options: BrowserWalletPointsOptions = {}) {
  if (!isAddress(userAddress)) {
    throw new Error(`Invalid wallet address for browser points scan: ${userAddress}`);
  }

  const protocolChain = options.chainId ? getProtocolChainById(options.chainId) : getDefaultProtocolChain();
  const chainId = protocolChain.id;
  assertBrowserPointsRpcCanScanLogs(chainId);
  const client = getProtocolReadClient(chainId);
  const latestBlock = Number(await client.getBlockNumber());
  const finalityConfirmations = options.finalityConfirmations ?? DEFAULT_FINALITY_CONFIRMATIONS;
  const finalizedBlockNumber = Math.max(0, latestBlock - finalityConfirmations);
  const fromBlock = getStartBlock(chainId, options.fromBlock);
  const finalizedBlock = await client.getBlock({ blockNumber: BigInt(finalizedBlockNumber) });
  const walletAddress = getAddress(userAddress);

  if (finalizedBlockNumber < fromBlock) {
    return createUserSnapshot({
      userAddress: walletAddress,
      actions: [],
      chainId,
      fromBlock,
      finalizedBlockNumber,
      finalizedBlockTimestamp: finalizedBlock.timestamp,
    });
  }

  const factoryAddress = protocolChain.deployment.factory;
  const cacheKey = getBrowserWalletPointsCacheKey({
    chainId,
    factoryAddress,
    fromBlock,
    userAddress: walletAddress,
  });
  const cached = options.cache === false ? null : readBrowserWalletPointsCache(cacheKey);
  const cacheMatchesScan =
    cached?.chainId === chainId &&
    cached.fromBlock === fromBlock &&
    cached.factoryAddress.toLowerCase() === factoryAddress.toLowerCase() &&
    cached.userAddress.toLowerCase() === walletAddress.toLowerCase();
  const cachedActions = cacheMatchesScan ? cached.actions.filter(action => action.blockNumber <= finalizedBlockNumber) : [];
  const cachedPoolAddresses = cacheMatchesScan ? cached.poolAddresses : [];
  const scanFromBlock = cacheMatchesScan ? Math.max(fromBlock, cached.scannedToBlock + 1) : fromBlock;

  if (scanFromBlock > finalizedBlockNumber) {
    return createUserSnapshot({
      userAddress: walletAddress,
      actions: dedupeActions(cachedActions),
      chainId,
      fromBlock,
      finalizedBlockNumber,
      finalizedBlockTimestamp: finalizedBlock.timestamp,
    });
  }

  const ranges = Array.from(
    getBlockRanges(scanFromBlock, finalizedBlockNumber, getBlockChunkSize(chainId, options.blockChunkSize)),
  );
  const factoryScan = await scanPoolCreatedLogs({
    client,
    chainId,
    factoryAddress,
    userAddress: walletAddress,
    ranges,
  });
  const poolAddresses = dedupeAddresses([...cachedPoolAddresses, ...factoryScan.poolAddresses]);
  const poolActions = poolAddresses.length
    ? await scanWalletPoolLogs({
        client,
        chainId,
        userAddress: walletAddress,
        poolAddresses,
        ranges,
        poolAddressChunkSize: getPositiveInteger(options.poolAddressChunkSize, DEFAULT_POOL_ADDRESS_CHUNK_SIZE),
      })
    : [];
  const actions = dedupeActions([...cachedActions, ...factoryScan.actions, ...poolActions]);

  if (options.cache !== false) {
    writeBrowserWalletPointsCache(cacheKey, {
      version: BROWSER_POINTS_EXPORTER_VERSION,
      rulesVersion: POINTS_RULES_VERSION,
      chainId,
      factoryAddress,
      fromBlock,
      userAddress: walletAddress,
      scannedToBlock: finalizedBlockNumber,
      poolAddresses,
      actions,
    });
  }

  return createUserSnapshot({
    userAddress: walletAddress,
    actions,
    chainId,
    fromBlock,
    finalizedBlockNumber,
    finalizedBlockTimestamp: finalizedBlock.timestamp,
  });
}
