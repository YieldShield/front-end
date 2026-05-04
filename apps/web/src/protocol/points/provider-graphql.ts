import type { PointsProvider, QuestCompletionEntry, UserPoints, UserPointsSnapshot, UserStreakInfo } from "./types";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type GraphqlPointsProviderOptions = {
  endpoint: string;
};

export function createGraphqlPointsProvider(options: GraphqlPointsProviderOptions): PointsProvider {
  async function queryPointsIndex<T>(query: string, variables?: Record<string, unknown>) {
    if (!options.endpoint) {
      return null;
    }

    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Points query failed with ${response.status}`);
    }

    const json = (await response.json()) as GraphqlResponse<T>;
    if (json.errors?.length) {
      throw new Error(json.errors.map(error => error.message).join(", "));
    }

    return json.data ?? null;
  }

  async function fetchTopUsers(limit = 20) {
    const data = await queryPointsIndex<{ userPointss: { items: UserPoints[] } }>(
      `
        query TopUsers($limit: Int, $orderBy: String, $orderDirection: String) {
          userPointss(limit: $limit, orderBy: $orderBy, orderDirection: $orderDirection) {
            items {
              userAddress
              totalPoints
              lastUpdated
            }
          }
        }
      `,
      {
        limit,
        orderBy: "totalPoints",
        orderDirection: "desc",
      },
    );

    return data?.userPointss.items ?? [];
  }

  async function fetchGlobalStats() {
    const topUsers = await fetchTopUsers(1000);
    return {
      totalUsers: topUsers.length,
      totalDistributedPoints: topUsers.reduce((total, user) => total + BigInt(user.totalPoints || "0"), 0n),
    };
  }

  async function fetchUserPoints(userAddress: string) {
    const data = await queryPointsIndex<{ userPoints: UserPoints | null }>(
      `
        query UserPoints($address: String!) {
          userPoints(userAddress: $address) {
            userAddress
            totalPoints
            lastUpdated
          }
        }
      `,
      { address: userAddress.toLowerCase() },
    );

    return data?.userPoints ?? null;
  }

  async function fetchUserQuestProgress(userAddress: string) {
    const data = await queryPointsIndex<{ questCompletions: { items: QuestCompletionEntry[] } }>(
      `
        query QuestCompletions($where: questCompletionFilter) {
          questCompletions(where: $where, limit: 100) {
            items {
              id
              userAddress
              questId
              points
              completedAt
              poolAddress
            }
          }
        }
      `,
      {
        where: {
          userAddress: userAddress.toLowerCase(),
        },
      },
    );

    return data?.questCompletions.items ?? [];
  }

  async function fetchUserStreak(userAddress: string) {
    const data = await queryPointsIndex<{ userStreak: UserStreakInfo | null }>(
      `
        query UserStreak($address: String!) {
          userStreak(userAddress: $address) {
            userAddress
            currentStreak
            lastActiveDate
            longestStreak
          }
        }
      `,
      {
        address: userAddress.toLowerCase(),
      },
    );

    return data?.userStreak ?? null;
  }

  async function fetchUserRank(userAddress: string) {
    const topUsers = await fetchTopUsers(1000);
    const index = topUsers.findIndex(user => user.userAddress.toLowerCase() === userAddress.toLowerCase());
    return index === -1 ? null : index + 1;
  }

  async function fetchUserSnapshot(userAddress: string): Promise<UserPointsSnapshot | null> {
    const [user, questCompletions, streak, rank] = await Promise.all([
      fetchUserPoints(userAddress),
      fetchUserQuestProgress(userAddress),
      fetchUserStreak(userAddress),
      fetchUserRank(userAddress),
    ]);

    if (!user && questCompletions.length === 0 && !streak && rank === null) {
      return null;
    }

    return {
      metadata: {
        format: "yieldshield-lite/points-snapshot",
        version: 1,
        generatedAt: "",
        chainId: 0,
        source: "sqd",
        fromBlock: 0,
        finalizedBlockNumber: 0,
        finalizedBlockTimestamp: "",
        rulesVersion: "",
        exporterVersion: "graphql-provider",
      },
      user,
      rank,
      streak,
      questCompletions,
    };
  }

  return {
    fetchTopUsers,
    fetchGlobalStats,
    fetchUserSnapshot,
    fetchUserPoints,
    fetchUserQuestProgress,
    fetchUserStreak,
    fetchUserRank,
    isConfigured() {
      return Boolean(options.endpoint);
    },
  };
}
