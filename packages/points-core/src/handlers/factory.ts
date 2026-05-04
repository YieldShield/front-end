import type { FactoryEventName, IndexedAction, NormalizedLogContext } from "../types";
import { createIndexedAction, normalizeAddress, toStringValue } from "../normalize";

export const FACTORY_EVENT_NAMES = ["PoolCreated"] as const satisfies readonly FactoryEventName[];

export type PoolCreatedArgs = {
  poolAddress: string;
  shieldedToken: string;
  backingToken: string;
  commissionRate: bigint | number | string;
  poolFee: bigint | number | string;
  collateralRatio: bigint | number | string;
  creator: string;
};

type FactoryEventHandlerParams =
  | {
      eventName: "PoolCreated";
      args: PoolCreatedArgs;
      context: NormalizedLogContext;
    };

export function handleFactoryEvent(params: FactoryEventHandlerParams): IndexedAction[] {
  switch (params.eventName) {
    case "PoolCreated":
      return [
        createIndexedAction(params.context, {
          suffix: "pool-created",
          contractName: "SplitRiskPoolFactory",
          eventName: "PoolCreated",
          action: "create_pool",
          userAddress: params.args.creator,
          poolAddress: params.args.poolAddress,
          questId: "creator_pool_architect",
          repeatableActionId: "create_pool",
          metadata: {
            shieldedToken: normalizeAddress(params.args.shieldedToken) ?? params.args.shieldedToken,
            backingToken: normalizeAddress(params.args.backingToken) ?? params.args.backingToken,
            commissionRate: toStringValue(params.args.commissionRate),
            poolFee: toStringValue(params.args.poolFee),
            collateralRatio: toStringValue(params.args.collateralRatio),
          },
        }),
      ];
  }
}
