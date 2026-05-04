import type { GovernorEventName, IndexedAction, NormalizedLogContext } from "../types";
import { createIndexedAction, toNumber, toStringValue } from "../normalize";

export const GOVERNOR_EVENT_NAMES = [
  "ProposalCreated",
  "VoteCast",
  "VoteCastWithParams",
  "ProposalQueued",
  "ProposalExecuted",
  "ProposalCanceled",
] as const satisfies readonly GovernorEventName[];

export type GovernorEventArgsMap = {
  ProposalCreated: {
    proposalId: bigint | number | string;
    proposer: string;
    targets: string[];
    values: Array<bigint | number | string>;
    signatures: string[];
    calldatas: string[];
    voteStart: bigint | number | string;
    voteEnd: bigint | number | string;
    description: string;
  };
  VoteCast: {
    voter: string;
    proposalId: bigint | number | string;
    support: bigint | number | string;
    weight: bigint | number | string;
    reason: string;
  };
  VoteCastWithParams: {
    voter: string;
    proposalId: bigint | number | string;
    support: bigint | number | string;
    weight: bigint | number | string;
    reason: string;
    params: string;
  };
  ProposalQueued: {
    proposalId: bigint | number | string;
    etaSeconds: bigint | number | string;
  };
  ProposalExecuted: {
    proposalId: bigint | number | string;
  };
  ProposalCanceled: {
    proposalId: bigint | number | string;
  };
};

type GovernorEventHandlerParams<TEventName extends GovernorEventName = GovernorEventName> = {
  eventName: TEventName;
  args: GovernorEventArgsMap[TEventName];
  context: NormalizedLogContext;
};

type GovernorEventHandlerUnion = {
  [TEventName in GovernorEventName]: GovernorEventHandlerParams<TEventName>;
}[GovernorEventName];

export function handleGovernorEvent(params: GovernorEventHandlerUnion): IndexedAction[] {
  switch (params.eventName) {
    case "ProposalCreated":
      return [
        createIndexedAction(params.context, {
          suffix: "proposal-created",
          contractName: "YSGovernor",
          eventName: "ProposalCreated",
          action: "governance_proposal_created",
          userAddress: params.args.proposer,
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
            voteStart: toStringValue(params.args.voteStart),
            voteEnd: toStringValue(params.args.voteEnd),
            targetCount: params.args.targets.length,
            signatureCount: params.args.signatures.length,
            description: params.args.description,
          },
        }),
      ];
    case "VoteCast":
      return [
        createIndexedAction(params.context, {
          suffix: "vote-cast",
          contractName: "YSGovernor",
          eventName: "VoteCast",
          action: "governance_vote_cast",
          userAddress: params.args.voter,
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
            support: toNumber(params.args.support),
            weight: toStringValue(params.args.weight),
            reason: params.args.reason,
          },
        }),
      ];
    case "VoteCastWithParams":
      return [
        createIndexedAction(params.context, {
          suffix: "vote-cast-with-params",
          contractName: "YSGovernor",
          eventName: "VoteCastWithParams",
          action: "governance_vote_cast",
          userAddress: params.args.voter,
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
            support: toNumber(params.args.support),
            weight: toStringValue(params.args.weight),
            reason: params.args.reason,
            hasParams: true,
            params: params.args.params,
          },
        }),
      ];
    case "ProposalQueued":
      return [
        createIndexedAction(params.context, {
          suffix: "proposal-queued",
          contractName: "YSGovernor",
          eventName: "ProposalQueued",
          action: "governance_proposal_queued",
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
            etaSeconds: toStringValue(params.args.etaSeconds),
          },
        }),
      ];
    case "ProposalExecuted":
      return [
        createIndexedAction(params.context, {
          suffix: "proposal-executed",
          contractName: "YSGovernor",
          eventName: "ProposalExecuted",
          action: "governance_proposal_executed",
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
          },
        }),
      ];
    case "ProposalCanceled":
      return [
        createIndexedAction(params.context, {
          suffix: "proposal-canceled",
          contractName: "YSGovernor",
          eventName: "ProposalCanceled",
          action: "governance_proposal_canceled",
          metadata: {
            proposalId: toStringValue(params.args.proposalId),
          },
        }),
      ];
  }
}
