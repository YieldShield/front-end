import { EvmBatchProcessor, type BlockData, type FieldSelection, type Log } from "@subsquid/evm-processor";
import { POINTS_RULES_VERSION } from "@yieldshield-lite/points-core";
import packageJson from "../package.json" with { type: "json" };
import {
  applyPoints,
  buildProcessor,
  hashIndexedActions,
  readPointsSqdConfig,
  writeSnapshots,
} from "../src/index.js";
import { createPointsEventDecoders, decodePointsLog } from "../src/live/decode-log.js";
import { MemoryFinalDatabase } from "../src/live/memory-database.js";
import type { IndexedAction } from "../src/model/types.js";

type CliOptions = {
  outputDir: string;
  fromBlock: number;
  finalizedBlockNumber: number;
  finalizedBlockTimestamp: string;
  generatedAt: string;
  gatewayUrl?: string;
  rpcUrl?: string;
  finalityConfirmations: number;
  poolAddressAllowlist: string[];
};

const POINTS_SQD_FIELDS = {
  block: {
    timestamp: true,
  },
  log: {
    address: true,
    data: true,
    topics: true,
  },
  transaction: {
    hash: true,
  },
} as const satisfies FieldSelection;

type PointsSqdFields = typeof POINTS_SQD_FIELDS;
type PointsSqdBlock = BlockData<PointsSqdFields>;
type PointsSqdLog = Log<PointsSqdFields>;

function readFlag(name: string) {
  const flagIndex = process.argv.indexOf(name);
  if (flagIndex === -1) {
    return "";
  }

  return process.argv[flagIndex + 1] ?? "";
}

function readNumberFlag(name: string) {
  const value = readFlag(name);
  return value ? Number(value) : undefined;
}

function readAddressList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map(address => address.trim().toLowerCase())
    .filter(Boolean);
}

function parseCliOptions(): CliOptions {
  const config = readPointsSqdConfig(process.env);
  const finalizedBlockNumber = readNumberFlag("--finalized-block") ?? Number(process.env.FINALIZED_BLOCK ?? "");
  const finalizedBlockTimestamp = readFlag("--finalized-block-timestamp") || process.env.FINALIZED_BLOCK_TIMESTAMP;
  const generatedAt = readFlag("--generated-at") || process.env.GENERATED_AT || finalizedBlockTimestamp;
  const gatewayUrl = readFlag("--gateway-url") || process.env.SQD_GATEWAY_URL;
  const rpcUrl = readFlag("--rpc-url") || config.rpcUrl || undefined;

  if (!Number.isFinite(finalizedBlockNumber)) {
    throw new Error("Missing required --finalized-block <number> argument");
  }

  if (!finalizedBlockTimestamp) {
    throw new Error("Missing required --finalized-block-timestamp <iso> argument");
  }

  const safeGeneratedAt = generatedAt ?? finalizedBlockTimestamp;

  if (!gatewayUrl && !rpcUrl) {
    throw new Error("Provide --gateway-url/ SQD_GATEWAY_URL or --rpc-url/ RPC_URL for live SQD export");
  }

  return {
    outputDir: readFlag("--output") || config.snapshotOutputDir,
    fromBlock:
      readNumberFlag("--from-block") ??
      Math.min(config.factory.startBlock, config.pool.startBlock, config.governor.startBlock),
    finalizedBlockNumber,
    finalizedBlockTimestamp,
    generatedAt: safeGeneratedAt,
    gatewayUrl,
    rpcUrl,
    finalityConfirmations: readNumberFlag("--finality-confirmations") ?? Number(process.env.SQD_FINALITY_CONFIRMATIONS ?? "20"),
    poolAddressAllowlist: readAddressList(readFlag("--pool-address-allowlist") || process.env.POOL_ADDRESS_ALLOWLIST),
  };
}

function configureProcessor(options: CliOptions) {
  const processor = new EvmBatchProcessor()
    .setFields(POINTS_SQD_FIELDS)
    .setBlockRange({
      from: options.fromBlock,
      to: options.finalizedBlockNumber,
    })
    .setFinalityConfirmation(options.finalityConfirmations);

  if (options.gatewayUrl) {
    processor.setGateway(options.gatewayUrl);
  }

  if (options.rpcUrl) {
    processor.setRpcEndpoint(options.rpcUrl);
  } else {
    processor.setRpcDataIngestionSettings({ disabled: true });
  }

  return processor;
}

function addLogRequests(processor: EvmBatchProcessor<PointsSqdFields>, options: CliOptions) {
  const pointsProcessor = buildProcessor({ env: process.env });
  const decoders = createPointsEventDecoders(pointsProcessor);

  for (const request of decoders.staticLogRequests) {
    processor.addLog({
      address: [request.address],
      topic0: request.topic0,
      transaction: true,
      range: {
        from: Math.max(options.fromBlock, request.fromBlock),
        to: options.finalizedBlockNumber,
      },
    });
  }

  processor.addLog({
    topic0: decoders.poolEventTopics,
    transaction: true,
    range: {
      from: options.fromBlock,
      to: options.finalizedBlockNumber,
    },
  });

  // Ensure the handler runs even when the finalized block has no matching logs.
  processor.includeAllBlocks({
    from: options.finalizedBlockNumber,
    to: options.finalizedBlockNumber,
  });

  return {
    pointsProcessor,
    decoders,
  };
}

function getSortedLogs(block: PointsSqdBlock) {
  return [...block.logs].sort((left, right) => left.logIndex - right.logIndex);
}

async function writeFinalSnapshot(params: {
  actions: IndexedAction[];
  options: CliOptions;
}) {
  const result = applyPoints(params.actions);
  const snapshot = await writeSnapshots(result, {
    outputDir: params.options.outputDir,
    chainId: readPointsSqdConfig(process.env).chainId,
    fromBlock: params.options.fromBlock,
    finalizedBlockNumber: params.options.finalizedBlockNumber,
    finalizedBlockTimestamp: params.options.finalizedBlockTimestamp,
    generatedAt: params.options.generatedAt,
    rulesVersion: POINTS_RULES_VERSION,
    exporterVersion: packageJson.version,
    actionsHash: hashIndexedActions(params.actions),
  });

  process.stdout.write(
    `Exported ${result.leaderboard.length} users and ${result.totalDistributedPoints.toString()} total points to ${params.options.outputDir}\nManifest actions hash: ${snapshot.manifest.actionsHash}\n`,
  );
}

const options = parseCliOptions();
const processor = configureProcessor(options);
const { pointsProcessor, decoders } = addLogRequests(processor, options);
const knownPoolAddresses = new Set(options.poolAddressAllowlist);
const actions: IndexedAction[] = [];
let wroteSnapshot = false;

processor.run(new MemoryFinalDatabase(), async ctx => {
  for (const block of ctx.blocks) {
    for (const log of getSortedLogs(block)) {
      actions.push(
        ...decodePointsLog({
          processor: pointsProcessor,
          decoders,
          knownPoolAddresses,
          log: log as PointsSqdLog,
        }),
      );
    }
  }

  const lastBlock = ctx.blocks.at(-1);
  if (!wroteSnapshot && lastBlock && lastBlock.header.height >= options.finalizedBlockNumber) {
    wroteSnapshot = true;
    await writeFinalSnapshot({ actions, options });
  }
});
