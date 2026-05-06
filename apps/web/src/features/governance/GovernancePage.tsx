import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { formatAddress, formatTokenAmount } from "../../protocol/format";
import {
  fetchGovernanceOverview,
  fetchGovernanceUserOverview,
  type GovernanceProposalSummary,
} from "../../protocol/governance";

function getProposalStateBadgeClass(stateLabel: string) {
  switch (stateLabel) {
    case "Active":
      return "badge-secondary";
    case "Succeeded":
    case "Executed":
      return "badge-success";
    case "Pending":
    case "Queued":
      return "badge-warning";
    case "Canceled":
    case "Defeated":
    case "Expired":
      return "badge-error";
    default:
      return "badge-outline";
  }
}

function formatVoteCount(value: bigint) {
  return formatTokenAmount(value, 18);
}

function formatProposalDisplayId(proposalId: bigint) {
  const value = proposalId.toString();
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function ProposalListItem({ proposal }: { proposal: GovernanceProposalSummary }) {
  const votingVotes = proposal.forVotes + proposal.againstVotes;
  const forPercent = votingVotes > 0n ? (Number(proposal.forVotes) / Number(votingVotes)) * 100 : 0;
  const againstPercent = votingVotes > 0n ? (Number(proposal.againstVotes) / Number(votingVotes)) * 100 : 0;

  return (
    <article className="rounded-xl border border-base-300 bg-base-100 p-4 transition hover:border-secondary/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="my-0 text-xs text-font-grey">Proposal #{formatProposalDisplayId(proposal.proposalId)}</p>
          <h4 className="my-1 text-base font-semibold">{proposal.title}</h4>
          <p className="my-0 text-xs text-font-grey">
            Created {proposal.createdAtLabel} by {formatAddress(proposal.proposer)}
          </p>
        </div>
        <span className={`badge ${getProposalStateBadgeClass(proposal.stateLabel)}`}>{proposal.stateLabel}</span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-font-grey">
          <span>For {formatVoteCount(proposal.forVotes)} YS</span>
          <span>Against {formatVoteCount(proposal.againstVotes)} YS</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-base-200">
          <div className="h-full bg-success" style={{ width: `${Math.max(forPercent, 2)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-font-grey">
          <span>{forPercent.toFixed(1)}% for</span>
          <span>{againstPercent.toFixed(1)}% against</span>
        </div>
      </div>
    </article>
  );
}

export function GovernancePage() {
  const { activeProtocolChain } = useProtocolChain();
  const { address } = useAccount();
  const [delegateAddress] = useState("");
  const governanceQuery = useQuery({
    queryKey: ["governance-overview", activeProtocolChain.id],
    queryFn: () => fetchGovernanceOverview(activeProtocolChain.id),
  });
  const userOverviewQuery = useQuery({
    queryKey: ["governance-user-overview", activeProtocolChain.id, address],
    queryFn: () => fetchGovernanceUserOverview(activeProtocolChain.id, address!),
    enabled: Boolean(address),
  });
  const timelock = "timelock" in activeProtocolChain.deployment ? activeProtocolChain.deployment.timelock : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Governance</h1>
        <p className="text-base-content/70">
          YieldShield front end keeps the original governance workspace and reads live state from the governor, token,
          timelock, and factory contracts. Direct proposal writes and delegation updates stay visibly in place, but
          remain gated until the wallet-safe mutation pass is finished.
        </p>
      </div>

      {governanceQuery.isLoading ? (
        <div className="text-center py-16">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="text-font-grey mt-4">Loading governance state...</p>
        </div>
      ) : governanceQuery.error instanceof Error ? (
        <div className="alert alert-error">
          <span>{governanceQuery.error.message}</span>
        </div>
      ) : governanceQuery.data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card bg-base-200 flex flex-col" style={{ minHeight: "600px" }}>
              <div className="card-body flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center">All Proposals</h3>
                {governanceQuery.data.proposals.length > 0 ? (
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {governanceQuery.data.proposals.map(proposal => (
                      <ProposalListItem key={proposal.proposalId.toString()} proposal={proposal} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-font-grey">No proposals found.</p>
                    <p className="text-sm text-font-grey mt-1">Create the first proposal to get started.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-base-200 flex flex-col" style={{ minHeight: "600px" }}>
              <div className="card-body flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center">Your Voting Power</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-font-grey">Token Balance</span>
                    <span className="font-bold">
                      {userOverviewQuery.data ? `${formatVoteCount(userOverviewQuery.data.tokenBalance)} YS` : "0 YS"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-font-grey">Voting Power</span>
                    <span className="font-bold">
                      {userOverviewQuery.data ? `${formatVoteCount(userOverviewQuery.data.votingPower)} YS` : "0 YS"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-font-grey">Delegated To</span>
                    <div className="font-bold text-sm">
                      {userOverviewQuery.data?.delegatee ? formatAddress(userOverviewQuery.data.delegatee) : "Self"}
                    </div>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Delegate To</label>
                      <input
                        className="legacy-input"
                        value={delegateAddress}
                        placeholder="Enter address to delegate to"
                        disabled
                        readOnly
                      />
                    </div>
                    <button className="btn btn-primary w-full btn-sm" disabled>
                      Delegate Voting Power
                    </button>
                    <p className="text-xs text-font-grey">
                      Delegation editing returns in the direct-write governance pass. This card already reflects your
                      live token balance and current delegated voting weight.
                    </p>
                  </div>
                  <div className="divider my-2"></div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center">Current Parameters</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3 bg-base-100">
                        <h4 className="font-semibold mb-2 text-sm">SplitRiskPoolFactory</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-font-grey">Whitelisted Tokens:</span>
                            <span className="font-mono">{governanceQuery.data.whitelistedTokenCount} whitelisted</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-font-grey">Factory:</span>
                            <span className="font-mono">{formatAddress(activeProtocolChain.deployment.factory)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 bg-base-100">
                        <h4 className="font-semibold mb-2 text-sm">Governance</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-font-grey">Voting Delay:</span>
                            <span className="font-mono">{governanceQuery.data.votingDelay.toString()} blocks</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-font-grey">Voting Period:</span>
                            <span className="font-mono">{governanceQuery.data.votingPeriod.toString()} blocks</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-font-grey">Proposal Threshold:</span>
                            <span className="font-mono">{formatVoteCount(governanceQuery.data.proposalThreshold)} YS</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-font-grey">Quorum:</span>
                            <span className="font-mono">{formatVoteCount(governanceQuery.data.quorum)} YS</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-font-grey">Timelock Delay:</span>
                            <span className="font-mono">
                              {governanceQuery.data.timelockDelay !== null
                                ? `${governanceQuery.data.timelockDelay.toString()}s`
                                : timelock
                                  ? "Configured"
                                  : "Not deployed"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="text-lg font-bold mb-4 flex items-center">Create Custom Proposal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Proposal Description</label>
                  <textarea
                    className="legacy-input min-h-28"
                    placeholder="Describe your proposal..."
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Proposal Targets</label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input className="legacy-input flex-1" placeholder="Target contract address" disabled readOnly />
                    <input className="legacy-input md:w-28" placeholder="Value" disabled readOnly />
                    <input className="legacy-input flex-1" placeholder="Calldata (0x...)" disabled readOnly />
                  </div>
                  <button className="btn btn-primary btn-sm mt-3" disabled>
                    Add Target
                  </button>
                </div>

                <button className="btn btn-primary" disabled>
                  Create Proposal
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 mt-6">
            <div className="card-body">
              <h3 className="text-lg font-bold mb-4 flex items-center">Token Whitelist Management</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Token Address</label>
                  <input className="legacy-input" placeholder="0x..." disabled readOnly />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="legacy-input" placeholder="Token Name" disabled readOnly />
                  <input className="legacy-input" placeholder="Token Symbol" disabled readOnly />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="legacy-input" placeholder="Primary Oracle Feed" disabled readOnly />
                  <input className="legacy-input" placeholder="Backup Oracle Feed" disabled readOnly />
                </div>
                <input className="legacy-input" placeholder="Minimum Collateral Ratio (bp)" disabled readOnly />

                <button className="btn btn-primary" disabled>
                  Add Token to Whitelist
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
