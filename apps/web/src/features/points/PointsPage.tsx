import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  fetchGlobalStats,
  fetchTopUsers,
  fetchUserSnapshot,
  isGlobalPointsConfigured,
  isPointsConfigured,
} from "../../protocol/points";
import { formatAddress } from "../../protocol/format";

const SAVER_QUESTS = [
  { id: "saver_first_shield", name: "First Shield", points: 500 },
  { id: "saver_first_reward_claim", name: "First Reward Claim", points: 300 },
  { id: "saver_first_partial_withdrawal", name: "First Partial Withdrawal", points: 400 },
  { id: "saver_first_full_withdrawal", name: "First Full Withdrawal", points: 500 },
  { id: "saver_activate_shield", name: "Activate Shield", points: 1000 },
];

const PROTECTOR_QUESTS = [
  { id: "protector_first_protection", name: "First Protection", points: 500 },
  { id: "protector_first_commission", name: "First Commission Claim", points: 300 },
  { id: "protector_unlock_initiation", name: "Unlock Initiation", points: 400 },
  { id: "protector_unlock_cancellation", name: "Unlock Cancellation", points: 200 },
];

const CREATOR_QUESTS = [
  { id: "creator_pool_architect", name: "Pool Architect", points: 1000 },
  { id: "creator_fee_collector", name: "Fee Collector", points: 300 },
];

const STREAK_TIERS = [
  { minDays: 14, name: "Diamond" },
  { minDays: 7, name: "Dedicated" },
  { minDays: 3, name: "Active" },
  { minDays: 0, name: "Getting started" },
];

const TOTAL_QUESTS = SAVER_QUESTS.length + PROTECTOR_QUESTS.length + CREATOR_QUESTS.length;

function formatPoints(points: string | bigint) {
  const value = typeof points === "string" ? BigInt(points) : points;
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function LoadingValue() {
  return (
    <span className="inline-flex items-center gap-2 text-lg text-base-content/60">
      <span className="loading loading-spinner loading-sm text-secondary" aria-hidden="true" />
      <span>Loading</span>
    </span>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="text-center py-8" role="status" aria-live="polite">
      <span className="loading loading-spinner loading-md text-secondary" aria-hidden="true" />
      <p className="text-font-grey mt-4">{label}</p>
    </div>
  );
}

function PointsLoadingStatus({ isGlobalLoading, isPersonalLoading }: { isGlobalLoading: boolean; isPersonalLoading: boolean }) {
  if (!isGlobalLoading && !isPersonalLoading) {
    return null;
  }

  const title = isGlobalLoading && isPersonalLoading
    ? "Updating points"
    : isPersonalLoading
      ? "Scanning wallet activity"
      : "Loading snapshot data";
  const copy = isGlobalLoading && isPersonalLoading
    ? "Scanning finalized wallet activity and loading the snapshot leaderboard."
    : isPersonalLoading
      ? "Scanning finalized protocol activity for your connected wallet. This runs locally in your browser."
      : "Loading total points and leaderboard data from the configured snapshot fallback.";

  return (
    <div className="card bg-base-200 mb-8" role="status" aria-live="polite">
      <div className="card-body py-4">
        <div className="flex items-start gap-3">
          <span className="loading loading-spinner loading-md text-secondary mt-1" aria-hidden="true" />
          <div>
            <p className="my-0 font-semibold">{title}</p>
            <p className="my-1 text-sm text-font-grey">{copy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function QuestCategory({
  isLoading,
  title,
  quests,
  completedQuestIds,
}: {
  isLoading: boolean;
  title: string;
  quests: Array<{ id: string; name: string; points: number }>;
  completedQuestIds: Set<string>;
}) {
  const completed = quests.filter(quest => completedQuestIds.has(quest.id)).length;

  return (
    <div className="card bg-base-100">
      <div className="card-body p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg">{title}</h3>
          {isLoading ? (
            <span className="badge badge-lg gap-2">
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              Syncing
            </span>
          ) : (
            <span className="badge badge-lg">
              {completed}/{quests.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <progress className="progress progress-primary w-full mb-3" max={quests.length} />
        ) : (
          <progress className="progress progress-primary w-full mb-3" value={completed} max={quests.length} />
        )}
        <div className="space-y-2">
          {quests.map(quest => {
            const done = completedQuestIds.has(quest.id);

            return (
              <div
                key={quest.id}
                className={`flex justify-between items-center py-1 px-2 rounded ${done ? "bg-success/10" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <span className="h-3 w-3 rounded-full bg-base-300" aria-hidden="true" />
                  ) : (
                    <span className={done ? "text-success" : "text-base-content/40"}>{done ? "✓" : "○"}</span>
                  )}
                  <span className={done ? "line-through text-base-content/60" : ""}>{quest.name}</span>
                </div>
                <span className="font-mono text-sm">{quest.points} pts</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PointsPage() {
  const { address } = useAccount();
  const configured = isPointsConfigured();
  const globalConfigured = isGlobalPointsConfigured();

  const topUsersQuery = useQuery({
    queryKey: ["points-top-users"],
    queryFn: () => fetchTopUsers(20),
    enabled: globalConfigured,
  });
  const globalStatsQuery = useQuery({
    queryKey: ["points-global-stats"],
    queryFn: fetchGlobalStats,
    enabled: globalConfigured,
  });
  const userSnapshotQuery = useQuery({
    queryKey: ["points-user-snapshot", address],
    queryFn: () => fetchUserSnapshot(address!),
    enabled: configured && Boolean(address),
  });

  const completedQuestIds = useMemo(
    () => new Set((userSnapshotQuery.data?.questCompletions ?? []).map(entry => entry.questId)),
    [userSnapshotQuery.data?.questCompletions],
  );

  const isPersonalPointsLoading = Boolean(address && configured && userSnapshotQuery.isPending);
  const isPersonalPointsUpdating = Boolean(address && configured && userSnapshotQuery.isFetching);
  const isGlobalStatsLoading = Boolean(globalConfigured && (topUsersQuery.isPending || globalStatsQuery.isPending));
  const isGlobalStatsUpdating = Boolean(globalConfigured && (topUsersQuery.isFetching || globalStatsQuery.isFetching));
  const globalStatsError =
    !isGlobalStatsLoading && (globalStatsQuery.isError || topUsersQuery.isError)
      ? (globalStatsQuery.error ?? topUsersQuery.error)
      : null;
  const saverCompleted = SAVER_QUESTS.filter(quest => completedQuestIds.has(quest.id)).length;
  const protectorCompleted = PROTECTOR_QUESTS.filter(quest => completedQuestIds.has(quest.id)).length;
  const creatorCompleted = CREATOR_QUESTS.filter(quest => completedQuestIds.has(quest.id)).length;
  const totalQuestsCompleted = saverCompleted + protectorCompleted + creatorCompleted;
  const currentStreak = Number(userSnapshotQuery.data?.streak?.currentStreak ?? "0");
  const currentTier = STREAK_TIERS.find(tier => currentStreak >= tier.minDays) ?? STREAK_TIERS.at(-1)!;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Testnet Points</h1>
          <p className="text-base-content/70">
            Earn points by exploring the full YieldShield protocol. Complete the live V1 quests and maintain your
            activity streak. Your wallet points are computed locally in the browser from finalized protocol logs;
            leaderboard and rank data use the SQD snapshot fallback when it is configured.
          </p>
        </div>

        {address && configured ? (
          <div className="card bg-base-200 mb-8" aria-busy={isPersonalPointsLoading}>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat bg-base-100 rounded-lg p-4">
                  <div className="stat-title">Total Points</div>
                  <div className="stat-value text-2xl">
                    {isPersonalPointsLoading ? (
                      <LoadingValue />
                    ) : userSnapshotQuery.data?.user ? (
                      formatPoints(userSnapshotQuery.data.user.totalPoints)
                    ) : (
                      "0"
                    )}
                  </div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-4">
                  <div className="stat-title">Rank</div>
                  <div className="stat-value text-2xl">
                    {isPersonalPointsLoading ? <LoadingValue /> : userSnapshotQuery.data?.rank ? `#${userSnapshotQuery.data.rank}` : "N/A"}
                  </div>
                  <div className="stat-desc">{globalConfigured ? "From snapshot fallback" : "Snapshot fallback required"}</div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-4">
                  <div className="stat-title">Streak</div>
                  <div className="stat-value text-2xl">
                    {isPersonalPointsLoading ? (
                      <LoadingValue />
                    ) : (
                      <>
                        {currentStreak} {currentStreak === 1 ? "day" : "days"}
                      </>
                    )}
                  </div>
                  <div className="stat-desc">
                    {isPersonalPointsLoading ? "Syncing quest activity" : currentTier.name}
                  </div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-4">
                  <div className="stat-title">Quests Done</div>
                  <div className="stat-value text-2xl">
                    {isPersonalPointsLoading ? <LoadingValue /> : `${totalQuestsCompleted}/${TOTAL_QUESTS}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!address ? (
          <div className="alert alert-warning mb-8">
            <span>Connect your wallet to see your points, quests, and streak.</span>
          </div>
        ) : null}

        <PointsLoadingStatus isGlobalLoading={isGlobalStatsUpdating} isPersonalLoading={isPersonalPointsUpdating} />

        {address && configured && userSnapshotQuery.isError ? (
          <div className="alert alert-error mb-8">
            <span>Personal points unavailable: {getErrorMessage(userSnapshotQuery.error)}</span>
          </div>
        ) : null}

        {!configured ? (
          <div className="alert mb-8 shadow-none">
            <span>
              Personal point totals need either the browser points provider or a configured fallback source.
            </span>
          </div>
        ) : null}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quest Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuestCategory
              isLoading={isPersonalPointsLoading}
              title="Saver"
              quests={SAVER_QUESTS}
              completedQuestIds={completedQuestIds}
            />
            <QuestCategory
              isLoading={isPersonalPointsLoading}
              title="Protector"
              quests={PROTECTOR_QUESTS}
              completedQuestIds={completedQuestIds}
            />
            <QuestCategory
              isLoading={isPersonalPointsLoading}
              title="Pool Creator"
              quests={CREATOR_QUESTS}
              completedQuestIds={completedQuestIds}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="font-bold text-lg mb-4">Activity Streak</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Consecutive Days</th>
                      <th>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STREAK_TIERS.map(tier => (
                      <tr key={tier.name} className={!isPersonalPointsLoading && currentStreak >= tier.minDays ? "bg-primary/5" : ""}>
                        <td>{tier.minDays === 0 ? "0-2" : `${tier.minDays}+`}</td>
                        <td>{tier.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card bg-base-200" aria-busy={isGlobalStatsUpdating}>
            <div className="card-body">
              <h3 className="font-bold text-lg mb-4">Global Stats</h3>
              {globalConfigured && globalStatsError ? (
                <div className="alert alert-warning shadow-none">
                  <span>Unable to load global points data: {getErrorMessage(globalStatsError)}</span>
                </div>
              ) : globalConfigured ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stat bg-base-100 rounded-lg p-4">
                    <div className="stat-title">Total Points Distributed</div>
                    <div className="stat-value text-2xl">
                      {globalStatsQuery.isPending ? (
                        <LoadingValue />
                      ) : globalStatsQuery.data ? (
                        formatPoints(globalStatsQuery.data.totalDistributedPoints)
                      ) : (
                        "0"
                      )}
                    </div>
                  </div>
                  <div className="stat bg-base-100 rounded-lg p-4">
                    <div className="stat-title">Participants</div>
                    <div className="stat-value text-2xl">
                      {globalStatsQuery.isPending ? <LoadingValue /> : (globalStatsQuery.data?.totalUsers ?? 0)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-font-grey">
                  Global totals depend on the optional SQD snapshot fallback. Your personal points still compute locally
                  from your connected wallet activity.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-200" aria-busy={Boolean(globalConfigured && topUsersQuery.isFetching)}>
          <div className="card-body">
            <h3 className="font-bold text-lg mb-4">Leaderboard</h3>
            {globalConfigured ? (
              topUsersQuery.isPending ? (
                <LoadingPanel label="Loading snapshot leaderboard..." />
              ) : topUsersQuery.isError ? (
                <div className="alert alert-warning shadow-none">
                  <span>Unable to load leaderboard: {getErrorMessage(topUsersQuery.error)}</span>
                </div>
              ) : topUsersQuery.data && topUsersQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Address</th>
                        <th>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsersQuery.data.map((user, index) => (
                        <tr key={user.userAddress}>
                          <td>#{index + 1}</td>
                          <td className="font-mono">{formatAddress(user.userAddress)}</td>
                          <td>{formatPoints(user.totalPoints)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert shadow-none">
                  <span>No points participants found yet.</span>
                </div>
              )
            ) : (
              <div className="alert shadow-none">
                <span>The leaderboard is hidden until an SQD snapshot fallback is configured.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
