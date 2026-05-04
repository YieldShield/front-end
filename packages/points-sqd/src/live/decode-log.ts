import type { Abi, AbiEvent, Hex } from "viem";
import { decodeEventLog, getAbiItem, toEventSelector } from "viem";
import type {
  ContractName,
  FactoryEventName,
  GovernorEventName,
  IndexedAction,
  NormalizedLogContext,
  PoolEventName,
  SupportedEventName,
} from "../model/types.js";
import type { buildProcessor } from "../processor.js";

export type PointsLiveLog = {
  address: string;
  data: string;
  topics: readonly string[];
  logIndex: number;
  block:
    | {
        header: {
          height: number;
          timestamp: number;
        };
      }
    | {
        height: number;
        timestamp: number;
      };
  transaction?: {
    hash: string;
  };
  getTransaction?: () => {
    hash: string;
  };
};

type ProcessorShape = ReturnType<typeof buildProcessor>;

type EventDecoder = {
  contractName: ContractName;
  eventName: SupportedEventName;
  topic0: Hex;
  abiEvent: AbiEvent;
  address?: string;
};

export type PointsEventDecoders = {
  byTopic0: Map<string, EventDecoder[]>;
  factoryAddress: string;
  governorAddress: string;
  poolEventTopics: string[];
  staticLogRequests: Array<{
    address: string;
    topic0: string[];
    fromBlock: number;
  }>;
};

function getAbiEvent(abi: unknown, eventName: string) {
  const item = getAbiItem({ abi: abi as Abi, name: eventName });
  if (!item || item.type !== "event") {
    throw new Error(`ABI event not found: ${eventName}`);
  }

  return item;
}

function addDecoder(decoders: Map<string, EventDecoder[]>, decoder: EventDecoder) {
  const key = decoder.topic0.toLowerCase();
  const existing = decoders.get(key) ?? [];
  existing.push(decoder);
  decoders.set(key, existing);
}

export function createPointsEventDecoders(processor: ProcessorShape): PointsEventDecoders {
  const byTopic0 = new Map<string, EventDecoder[]>();
  const staticLogRequests: PointsEventDecoders["staticLogRequests"] = [];
  const poolEventTopics = new Set<string>();
  let factoryAddress = "";
  let governorAddress = "";

  for (const contract of processor.contracts) {
    const topic0: string[] = [];

    for (const eventName of contract.events) {
      const abiEvent = getAbiEvent(contract.abi, eventName);
      const eventTopic = toEventSelector(abiEvent);
      const decoder: EventDecoder = {
        contractName: contract.name,
        eventName,
        topic0: eventTopic,
        abiEvent,
        address: typeof contract.address === "string" ? contract.address.toLowerCase() : undefined,
      };

      addDecoder(byTopic0, decoder);
      topic0.push(eventTopic);

      if (contract.name === "SplitRiskPool") {
        poolEventTopics.add(eventTopic);
      }
    }

    if (typeof contract.address === "string") {
      staticLogRequests.push({
        address: contract.address.toLowerCase(),
        topic0,
        fromBlock: contract.startBlock,
      });

      if (contract.name === "SplitRiskPoolFactory") {
        factoryAddress = contract.address.toLowerCase();
      }

      if (contract.name === "YSGovernor") {
        governorAddress = contract.address.toLowerCase();
      }
    }
  }

  return {
    byTopic0,
    factoryAddress,
    governorAddress,
    poolEventTopics: [...poolEventTopics],
    staticLogRequests,
  };
}

function getTransactionHash(log: PointsLiveLog) {
  return log.transaction?.hash ?? log.getTransaction?.().hash ?? "";
}

function getBlockHeader(log: PointsLiveLog) {
  return "header" in log.block ? log.block.header : log.block;
}

function createLogContext(processor: ProcessorShape, log: PointsLiveLog): NormalizedLogContext {
  const transactionHash = getTransactionHash(log);
  const blockHeader = getBlockHeader(log);
  if (!transactionHash) {
    throw new Error(`Missing transaction hash for log ${blockHeader.height}:${log.logIndex}`);
  }

  return {
    chainId: processor.chainId,
    contractAddress: log.address,
    blockNumber: blockHeader.height,
    blockTimestamp: blockHeader.timestamp,
    transactionHash,
    logIndex: log.logIndex,
  };
}

function decodeArgs(decoder: EventDecoder, log: PointsLiveLog) {
  const decoded = decodeEventLog({
    abi: [decoder.abiEvent],
    data: log.data as Hex,
    topics: log.topics as [Hex, ...Hex[]],
  });

  return decoded.args;
}

function isKnownPoolLog(logAddress: string, knownPoolAddresses: ReadonlySet<string>) {
  return knownPoolAddresses.has(logAddress.toLowerCase());
}

export function decodePointsLog(params: {
  processor: ProcessorShape;
  decoders: PointsEventDecoders;
  knownPoolAddresses: Set<string>;
  log: PointsLiveLog;
}): IndexedAction[] {
  const topic0 = params.log.topics[0]?.toLowerCase();
  if (!topic0) {
    return [];
  }

  const logAddress = params.log.address.toLowerCase();
  const candidates = params.decoders.byTopic0.get(topic0) ?? [];
  const decoder = candidates.find(candidate => {
    if (candidate.contractName === "SplitRiskPool") {
      return isKnownPoolLog(logAddress, params.knownPoolAddresses);
    }

    return candidate.address === logAddress;
  });

  if (!decoder) {
    return [];
  }

  const args = decodeArgs(decoder, params.log);
  const context = createLogContext(params.processor, params.log);

  if (decoder.contractName === "SplitRiskPoolFactory" && decoder.eventName === "PoolCreated") {
    const poolAddress = (args as { poolAddress?: string }).poolAddress;
    if (poolAddress) {
      params.knownPoolAddresses.add(poolAddress.toLowerCase());
    }

    return params.processor.normalizeEvent({
      contractName: "SplitRiskPoolFactory",
      eventName: decoder.eventName as FactoryEventName,
      args: args as Parameters<ProcessorShape["normalizeEvent"]>[0]["args"],
      context,
    } as Parameters<ProcessorShape["normalizeEvent"]>[0]);
  }

  if (decoder.contractName === "SplitRiskPool") {
    return params.processor.normalizeEvent({
      contractName: "SplitRiskPool",
      eventName: decoder.eventName as PoolEventName,
      args: args as Parameters<ProcessorShape["normalizeEvent"]>[0]["args"],
      context,
    } as Parameters<ProcessorShape["normalizeEvent"]>[0]);
  }

  return params.processor.normalizeEvent({
    contractName: "YSGovernor",
    eventName: decoder.eventName as GovernorEventName,
    args: args as Parameters<ProcessorShape["normalizeEvent"]>[0]["args"],
    context,
  } as Parameters<ProcessorShape["normalizeEvent"]>[0]);
}
