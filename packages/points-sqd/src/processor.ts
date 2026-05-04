import SplitRiskPoolAbi from "../abis/SplitRiskPool.json" with { type: "json" };
import SplitRiskPoolFactoryAbi from "../abis/SplitRiskPoolFactory.json" with { type: "json" };
import YSGovernorAbi from "../abis/YSGovernor.json" with { type: "json" };
import { readPointsSqdConfig } from "./config";
import { FACTORY_EVENT_NAMES, handleFactoryEvent, type PoolCreatedArgs } from "./handlers/factory";
import {
  GOVERNOR_EVENT_NAMES,
  handleGovernorEvent,
  type GovernorEventArgsMap,
} from "./handlers/governor";
import { POOL_EVENT_NAMES, handlePoolEvent, type PoolEventArgsMap } from "./handlers/pool";
import type {
  BuildProcessorResult,
  ContractName,
  FactoryEventName,
  GovernorEventName,
  IndexedAction,
  NormalizedLogContext,
  PoolEventName,
  SupportedEventName,
} from "./model/types";

type BuildProcessorOptions = {
  env?: Record<string, string | undefined>;
};

type FactoryNormalizeEventParams = {
  contractName: "SplitRiskPoolFactory";
  eventName: FactoryEventName;
  args: PoolCreatedArgs;
  context: NormalizedLogContext;
};

type PoolNormalizeEventParams = {
  [TEventName in PoolEventName]: {
    contractName: "SplitRiskPool";
    eventName: TEventName;
    args: PoolEventArgsMap[TEventName];
    context: NormalizedLogContext;
  };
}[PoolEventName];

type GovernorNormalizeEventParams = {
  [TEventName in GovernorEventName]: {
    contractName: "YSGovernor";
    eventName: TEventName;
    args: GovernorEventArgsMap[TEventName];
    context: NormalizedLogContext;
  };
}[GovernorEventName];

type NormalizeEventParams =
  | FactoryNormalizeEventParams
  | PoolNormalizeEventParams
  | GovernorNormalizeEventParams;

export const SUPPORTED_POINTS_EVENTS: Record<ContractName, readonly SupportedEventName[]> = {
  SplitRiskPoolFactory: FACTORY_EVENT_NAMES,
  SplitRiskPool: POOL_EVENT_NAMES,
  YSGovernor: GOVERNOR_EVENT_NAMES,
};

export function buildProcessor(options: BuildProcessorOptions = {}) {
  const config = readPointsSqdConfig(options.env ?? {});

  const contracts: BuildProcessorResult["contracts"] = [
    {
      name: "SplitRiskPoolFactory",
      address: config.factory.address,
      startBlock: config.factory.startBlock,
      events: FACTORY_EVENT_NAMES,
      abi: SplitRiskPoolFactoryAbi,
    },
    {
      name: "SplitRiskPool",
      address: {
        kind: "factory-template",
        factoryAddress: config.factory.address,
        eventName: "PoolCreated",
        parameter: "poolAddress",
      },
      startBlock: config.pool.startBlock,
      events: POOL_EVENT_NAMES,
      abi: SplitRiskPoolAbi,
    },
    {
      name: "YSGovernor",
      address: config.governor.address,
      startBlock: config.governor.startBlock,
      events: GOVERNOR_EVENT_NAMES,
      abi: YSGovernorAbi,
    },
  ];

  return {
    chainId: config.chainId,
    contracts,
    normalizeEvent(params: NormalizeEventParams): IndexedAction[] {
      switch (params.contractName) {
        case "SplitRiskPoolFactory":
          return handleFactoryEvent({
            eventName: params.eventName,
            args: params.args,
            context: {
              ...params.context,
              chainId: config.chainId,
              contractAddress: config.factory.address,
            },
          });
        case "SplitRiskPool":
          return handlePoolEvent({
            eventName: params.eventName,
            args: params.args,
            context: {
              ...params.context,
              chainId: config.chainId,
            },
          } as Parameters<typeof handlePoolEvent>[0]);
        case "YSGovernor":
          return handleGovernorEvent({
            eventName: params.eventName,
            args: params.args,
            context: {
              ...params.context,
              chainId: config.chainId,
              contractAddress: config.governor.address,
            },
          } as Parameters<typeof handleGovernorEvent>[0]);
      }
    },
  };
}
