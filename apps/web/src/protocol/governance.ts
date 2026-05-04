import { type Address } from "viem";
import {
  FACTORY_ABI,
  GOVERNANCE_TOKEN_ABI,
  GOVERNOR_ABI,
  GOVERNOR_PROPOSAL_CREATED_EVENT,
  TIMELOCK_ABI,
} from "./abi";
import { formatTimestamp } from "./format";
import { getProtocolChainById, getProtocolReadClient } from "./networks";

export type GovernanceProposalSummary = {
  proposalId: bigint;
  displayId: string;
  title: string;
  stateLabel: string;
  createdAtLabel: string;
  createdAtTimestamp: bigint;
  proposer: Address;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  voteStart: bigint;
  voteEnd: bigint;
  targetCount: number;
};

export type GovernanceOverview = {
  proposalThreshold: bigint;
  quorum: bigint;
  timelockDelay: bigint | null;
  votingDelay: bigint;
  votingPeriod: bigint;
  whitelistedTokenCount: number;
  proposals: GovernanceProposalSummary[];
};

export type GovernanceUserOverview = {
  delegatee: Address | null;
  tokenBalance: bigint;
  votingPower: bigint;
};

const PROPOSAL_STATE_LABELS = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;

function formatProposalTitle(description: string) {
  const firstLine = description
    .split("\n")
    .map(line => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled proposal";
  }

  return firstLine.replace(/^#+\s*/, "").slice(0, 84);
}

function mapProposalState(state: bigint | number | undefined) {
  if (state === undefined) {
    return "Unknown";
  }

  return PROPOSAL_STATE_LABELS[Number(state)] ?? "Unknown";
}

export async function fetchGovernanceOverview(chainId: number) {
  const protocolChain = getProtocolChainById(chainId);
  const client = getProtocolReadClient(chainId);
  const timelockAddress = "timelock" in protocolChain.deployment ? protocolChain.deployment.timelock : undefined;

  const baseContracts = [
    {
      address: protocolChain.deployment.governor,
      abi: GOVERNOR_ABI,
      functionName: "votingDelay" as const,
    },
    {
      address: protocolChain.deployment.governor,
      abi: GOVERNOR_ABI,
      functionName: "votingPeriod" as const,
    },
    {
      address: protocolChain.deployment.governor,
      abi: GOVERNOR_ABI,
      functionName: "proposalThreshold" as const,
    },
    {
      address: protocolChain.deployment.governor,
      abi: GOVERNOR_ABI,
      functionName: "quorum" as const,
      args: [0n] as const,
    },
    {
      address: protocolChain.deployment.factory,
      abi: FACTORY_ABI,
      functionName: "getWhitelistedTokens" as const,
    },
  ];

  const contracts = timelockAddress
    ? [
        ...baseContracts,
        {
          address: timelockAddress,
          abi: TIMELOCK_ABI,
          functionName: "getMinDelay" as const,
        },
      ]
    : baseContracts;

  const baseResults = await client.multicall({
    allowFailure: false,
    contracts,
  });

  const proposalCreatedLogs = await client
    .getLogs({
      address: protocolChain.deployment.governor,
      event: GOVERNOR_PROPOSAL_CREATED_EVENT,
      fromBlock: 0n,
      toBlock: "latest",
    })
    .catch(() => []);

  const uniqueBlocks = Array.from(new Set(proposalCreatedLogs.map(log => Number(log.blockNumber ?? 0n))));
  const blockTimestamps = new Map<number, bigint>();

  await Promise.all(
    uniqueBlocks.map(async blockNumber => {
      const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
      blockTimestamps.set(blockNumber, block.timestamp);
    }),
  );

  const sortedLogs = [...proposalCreatedLogs].sort((left, right) => Number((right.blockNumber ?? 0n) - (left.blockNumber ?? 0n)));

  const proposalResults =
    sortedLogs.length > 0
      ? await client.multicall({
          allowFailure: true,
          contracts: sortedLogs.flatMap(log => {
            const proposalId = (log.args as { proposalId?: bigint }).proposalId ?? 0n;

            return [
              {
                address: protocolChain.deployment.governor,
                abi: GOVERNOR_ABI,
                functionName: "state" as const,
                args: [proposalId] as const,
              },
              {
                address: protocolChain.deployment.governor,
                abi: GOVERNOR_ABI,
                functionName: "proposalVotes" as const,
                args: [proposalId] as const,
              },
            ];
          }),
        })
      : [];

  const proposals = sortedLogs.map((log, index) => {
    const args = log.args as {
      proposalId?: bigint;
      proposer?: Address;
      targets?: Address[];
      voteStart?: bigint;
      voteEnd?: bigint;
      description?: string;
    };

    const proposalId = args.proposalId ?? 0n;
    const stateResult = proposalResults[index * 2];
    const votesResult = proposalResults[index * 2 + 1];
    const votes =
      votesResult?.status === "success"
        ? (votesResult.result as readonly [bigint, bigint, bigint])
        : ([0n, 0n, 0n] as const);
    const blockTimestamp = blockTimestamps.get(Number(log.blockNumber ?? 0n)) ?? 0n;
    const stateValue =
      stateResult?.status === "success" ? Number(stateResult.result as unknown as number) : undefined;

    return {
      proposalId,
      displayId: proposalId.toString(),
      title: formatProposalTitle(args.description ?? ""),
      stateLabel: mapProposalState(stateValue),
      createdAtLabel: blockTimestamp > 0n ? formatTimestamp(blockTimestamp) : "Unknown date",
      createdAtTimestamp: blockTimestamp,
      proposer: args.proposer ?? "0x0000000000000000000000000000000000000000",
      againstVotes: votes[0],
      forVotes: votes[1],
      abstainVotes: votes[2],
      voteStart: args.voteStart ?? 0n,
      voteEnd: args.voteEnd ?? 0n,
      targetCount: args.targets?.length ?? 0,
    } satisfies GovernanceProposalSummary;
  });

  const whitelistedTokens = baseResults[4] as Address[];
  const timelockDelay = timelockAddress ? (baseResults[5] as bigint) : null;

  return {
    votingDelay: baseResults[0] as bigint,
    votingPeriod: baseResults[1] as bigint,
    proposalThreshold: baseResults[2] as bigint,
    quorum: baseResults[3] as bigint,
    whitelistedTokenCount: whitelistedTokens.length,
    timelockDelay,
    proposals,
  } satisfies GovernanceOverview;
}

export async function fetchGovernanceUserOverview(chainId: number, account: Address) {
  const protocolChain = getProtocolChainById(chainId);
  const client = getProtocolReadClient(chainId);

  const [tokenBalance, votingPower, delegatee] = await client.multicall({
    allowFailure: false,
    contracts: [
      {
        address: protocolChain.deployment.ysToken,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: "balanceOf",
        args: [account],
      },
      {
        address: protocolChain.deployment.ysToken,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: "getVotes",
        args: [account],
      },
      {
        address: protocolChain.deployment.ysToken,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: "delegates",
        args: [account],
      },
    ],
  });

  return {
    tokenBalance: tokenBalance as bigint,
    votingPower: votingPower as bigint,
    delegatee: delegatee as Address,
  } satisfies GovernanceUserOverview;
}
