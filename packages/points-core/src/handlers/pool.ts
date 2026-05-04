import type { IndexedAction, NormalizedLogContext, PoolEventName } from "../types";
import { createIndexedAction, toStringValue } from "../normalize";

export const POOL_EVENT_NAMES = [
  "ShieldedAssetDeposited",
  "ProtectorAssetDeposited",
  "CommissionClaimed",
  "RewardsClaimed",
  "ShieldedWithdrawal",
  "PartialWithdrawal",
  "UnlockProcessStarted",
  "ShieldActivated",
  "UnlockProcessCancelled",
  "PoolFeePaid",
] as const satisfies readonly PoolEventName[];

export type PoolEventArgsMap = {
  ShieldedAssetDeposited: {
    depositor: string;
    asset: string;
    amount: bigint | number | string;
    tokensIssued: bigint | number | string;
  };
  ProtectorAssetDeposited: {
    depositor: string;
    asset: string;
    amount: bigint | number | string;
    tokensIssued: bigint | number | string;
  };
  CommissionClaimed: {
    recipient: string;
    tokenId: bigint | number | string;
    amount: bigint | number | string;
  };
  RewardsClaimed: {
    shieldedAddress: string;
    amount: bigint | number | string;
    asset: string;
  };
  ShieldedWithdrawal: {
    withdrawer: string;
    amount: bigint | number | string;
    preferredAsset: string;
  };
  PartialWithdrawal: {
    user: string;
    oldTokenId: bigint | number | string;
    newTokenId: bigint | number | string;
    withdrawAmount: bigint | number | string;
    remainingAmount: bigint | number | string;
  };
  UnlockProcessStarted: {
    protector: string;
    tokenId: bigint | number | string;
    amount: bigint | number | string;
  };
  ShieldActivated: {
    withdrawer: string;
    amount: bigint | number | string;
    shieldedTokenAmount: bigint | number | string;
    backingTokenAmount: bigint | number | string;
  };
  UnlockProcessCancelled: {
    protector: string;
    tokenId: bigint | number | string;
  };
  PoolFeePaid: {
    creator: string;
    amount: bigint | number | string;
  };
};

type PoolEventHandlerParams<TEventName extends PoolEventName = PoolEventName> = {
  eventName: TEventName;
  args: PoolEventArgsMap[TEventName];
  context: NormalizedLogContext;
};

type PoolEventHandlerUnion = {
  [TEventName in PoolEventName]: PoolEventHandlerParams<TEventName>;
}[PoolEventName];

export function handlePoolEvent(params: PoolEventHandlerUnion): IndexedAction[] {
  const poolAddress = params.context.contractAddress;

  switch (params.eventName) {
    case "ShieldedAssetDeposited":
      return [
        createIndexedAction(params.context, {
          suffix: "shielded-deposit",
          contractName: "SplitRiskPool",
          eventName: "ShieldedAssetDeposited",
          action: "saver_deposit",
          userAddress: params.args.depositor,
          poolAddress,
          assetAddress: params.args.asset,
          amount: toStringValue(params.args.amount),
          questId: "saver_first_shield",
          repeatableActionId: "saver_deposit",
          metadata: {
            tokensIssued: toStringValue(params.args.tokensIssued),
          },
        }),
      ];
    case "ProtectorAssetDeposited":
      return [
        createIndexedAction(params.context, {
          suffix: "protector-deposit",
          contractName: "SplitRiskPool",
          eventName: "ProtectorAssetDeposited",
          action: "protector_deposit",
          userAddress: params.args.depositor,
          poolAddress,
          assetAddress: params.args.asset,
          amount: toStringValue(params.args.amount),
          questId: "protector_first_protection",
          repeatableActionId: "protector_deposit",
          metadata: {
            tokensIssued: toStringValue(params.args.tokensIssued),
          },
        }),
      ];
    case "CommissionClaimed":
      return [
        createIndexedAction(params.context, {
          suffix: "commission-claimed",
          contractName: "SplitRiskPool",
          eventName: "CommissionClaimed",
          action: "claim_commission",
          userAddress: params.args.recipient,
          poolAddress,
          amount: toStringValue(params.args.amount),
          questId: "protector_first_commission",
          repeatableActionId: "claim_commission",
          metadata: {
            tokenId: toStringValue(params.args.tokenId),
          },
        }),
      ];
    case "RewardsClaimed":
      return [
        createIndexedAction(params.context, {
          suffix: "rewards-claimed",
          contractName: "SplitRiskPool",
          eventName: "RewardsClaimed",
          action: "claim_rewards",
          userAddress: params.args.shieldedAddress,
          poolAddress,
          assetAddress: params.args.asset,
          amount: toStringValue(params.args.amount),
          questId: "saver_first_reward_claim",
          repeatableActionId: "claim_rewards",
        }),
      ];
    case "ShieldedWithdrawal":
      return [
        createIndexedAction(params.context, {
          suffix: "shielded-withdrawal",
          contractName: "SplitRiskPool",
          eventName: "ShieldedWithdrawal",
          action: "full_saver_withdrawal",
          userAddress: params.args.withdrawer,
          poolAddress,
          assetAddress: params.args.preferredAsset,
          amount: toStringValue(params.args.amount),
          questId: "saver_first_full_withdrawal",
          repeatableActionId: "full_saver_withdrawal",
        }),
      ];
    case "PartialWithdrawal":
      return [
        createIndexedAction(params.context, {
          suffix: "partial-withdrawal",
          contractName: "SplitRiskPool",
          eventName: "PartialWithdrawal",
          action: "partial_withdrawal",
          userAddress: params.args.user,
          poolAddress,
          amount: toStringValue(params.args.withdrawAmount),
          questId: "saver_first_partial_withdrawal",
          repeatableActionId: "partial_withdrawal",
          metadata: {
            oldTokenId: toStringValue(params.args.oldTokenId),
            newTokenId: toStringValue(params.args.newTokenId),
            remainingAmount: toStringValue(params.args.remainingAmount),
          },
        }),
      ];
    case "UnlockProcessStarted":
      return [
        createIndexedAction(params.context, {
          suffix: "unlock-started",
          contractName: "SplitRiskPool",
          eventName: "UnlockProcessStarted",
          action: "start_unlock",
          userAddress: params.args.protector,
          poolAddress,
          amount: toStringValue(params.args.amount),
          questId: "protector_unlock_initiation",
          repeatableActionId: "start_unlock",
          metadata: {
            tokenId: toStringValue(params.args.tokenId),
          },
        }),
      ];
    case "ShieldActivated":
      return [
        createIndexedAction(params.context, {
          suffix: "shield-activated",
          contractName: "SplitRiskPool",
          eventName: "ShieldActivated",
          action: "activate_shield",
          userAddress: params.args.withdrawer,
          poolAddress,
          amount: toStringValue(params.args.amount),
          questId: "saver_activate_shield",
          metadata: {
            shieldedTokenAmount: toStringValue(params.args.shieldedTokenAmount),
            backingTokenAmount: toStringValue(params.args.backingTokenAmount),
          },
        }),
      ];
    case "UnlockProcessCancelled":
      return [
        createIndexedAction(params.context, {
          suffix: "unlock-cancelled",
          contractName: "SplitRiskPool",
          eventName: "UnlockProcessCancelled",
          action: "cancel_unlock",
          userAddress: params.args.protector,
          poolAddress,
          questId: "protector_unlock_cancellation",
          metadata: {
            tokenId: toStringValue(params.args.tokenId),
          },
        }),
      ];
    case "PoolFeePaid":
      return [
        createIndexedAction(params.context, {
          suffix: "pool-fee-paid",
          contractName: "SplitRiskPool",
          eventName: "PoolFeePaid",
          action: "pay_pool_fee",
          userAddress: params.args.creator,
          poolAddress,
          amount: toStringValue(params.args.amount),
          questId: "creator_fee_collector",
          repeatableActionId: "pay_pool_fee",
        }),
      ];
  }
}
