import {
  getDateUtcFromIso,
  getPreviousDateUtc,
  getQuestById,
  getRepeatableActionById,
} from "./rules";
import type { IndexedAction, UserLedgerRow } from "./types";

export type ApplyPointsResult = {
  users: Map<string, UserLedgerRow>;
  leaderboard: UserLedgerRow[];
  totalDistributedPoints: bigint;
};

function compareActions(left: IndexedAction, right: IndexedAction) {
  if (left.blockNumber !== right.blockNumber) {
    return left.blockNumber - right.blockNumber;
  }

  if (left.logIndex !== right.logIndex) {
    return left.logIndex - right.logIndex;
  }

  return left.transactionHash.localeCompare(right.transactionHash);
}

function getUserLedger(users: Map<string, UserLedgerRow>, userAddress: string) {
  let row = users.get(userAddress);
  if (!row) {
    row = {
      userAddress,
      totalPoints: 0n,
      questPoints: 0n,
      repeatablePoints: 0n,
      questIds: new Set(),
      questCompletions: [],
      activityDates: new Set(),
      dailyActionCounts: new Map(),
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      lastUpdated: "",
    };
    users.set(userAddress, row);
  }

  return row;
}

function updateStreaks(row: UserLedgerRow) {
  const dates = Array.from(row.activityDates).sort();
  let longest = 0;
  let current = 0;
  let previousDate: string | null = null;

  for (const dateUtc of dates) {
    if (previousDate && getPreviousDateUtc(dateUtc) === previousDate) {
      current += 1;
    } else {
      current = 1;
    }

    if (current > longest) {
      longest = current;
    }

    previousDate = dateUtc;
  }

  row.currentStreak = dates.length ? current : 0;
  row.longestStreak = longest;
  row.lastActiveDate = dates.at(-1) ?? "";
}

export function applyPoints(actions: IndexedAction[]): ApplyPointsResult {
  const users = new Map<string, UserLedgerRow>();
  const sortedActions = [...actions].sort(compareActions);

  for (const action of sortedActions) {
    if (!action.userAddress || (!action.questId && !action.repeatableActionId)) {
      continue;
    }

    const row = getUserLedger(users, action.userAddress);
    row.activityDates.add(getDateUtcFromIso(action.occurredAt));
    row.lastUpdated = row.lastUpdated > action.occurredAt ? row.lastUpdated : action.occurredAt;

    if (action.questId && !row.questIds.has(action.questId)) {
      const quest = getQuestById(action.questId);
      if (quest) {
        const questPoints = BigInt(quest.points);
        row.questIds.add(action.questId);
        row.questPoints += questPoints;
        row.totalPoints += questPoints;
        row.questCompletions.push({
          id: `${action.userAddress}:${action.questId}`,
          userAddress: action.userAddress,
          questId: action.questId,
          points: quest.points.toString(),
          completedAt: action.occurredAt,
          poolAddress: action.poolAddress ?? null,
        });
      }
    }

    if (action.repeatableActionId) {
      const repeatableAction = getRepeatableActionById(action.repeatableActionId);
      if (repeatableAction) {
        const dateUtc = getDateUtcFromIso(action.occurredAt);
        const dailyActionKey = `${action.repeatableActionId}:${dateUtc}`;
        const nextCount = (row.dailyActionCounts.get(dailyActionKey) ?? 0) + 1;
        row.dailyActionCounts.set(dailyActionKey, nextCount);

        if (nextCount <= repeatableAction.dailyCap) {
          const repeatablePoints = BigInt(repeatableAction.points);
          row.repeatablePoints += repeatablePoints;
          row.totalPoints += repeatablePoints;
        }
      }
    }
  }

  for (const row of users.values()) {
    updateStreaks(row);
    row.questCompletions.sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  }

  const leaderboard = Array.from(users.values()).sort((left, right) => {
    if (left.totalPoints !== right.totalPoints) {
      return left.totalPoints > right.totalPoints ? -1 : 1;
    }

    if (left.lastUpdated !== right.lastUpdated) {
      return left.lastUpdated < right.lastUpdated ? 1 : -1;
    }

    return left.userAddress.localeCompare(right.userAddress);
  });

  const totalDistributedPoints = leaderboard.reduce((total, row) => total + row.totalPoints, 0n);

  return {
    users,
    leaderboard,
    totalDistributedPoints,
  };
}
