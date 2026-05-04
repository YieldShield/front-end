import { getPointsProvider, isGlobalPointsProviderConfigured } from "./provider";

export type { PointsGlobalStats, PointsProvider, QuestCompletionEntry, UserPoints, UserPointsSnapshot, UserStreakInfo } from "./types";

export async function fetchTopUsers(limit = 20) {
  return getPointsProvider().fetchTopUsers(limit);
}

export async function fetchGlobalStats() {
  return getPointsProvider().fetchGlobalStats();
}

export async function fetchTotalDistributedPoints() {
  return (await fetchGlobalStats()).totalDistributedPoints;
}

export async function fetchUserPoints(userAddress: string) {
  return getPointsProvider().fetchUserPoints(userAddress);
}

export async function fetchUserSnapshot(userAddress: string) {
  return getPointsProvider().fetchUserSnapshot(userAddress);
}

export async function fetchUserQuestProgress(userAddress: string) {
  return getPointsProvider().fetchUserQuestProgress(userAddress);
}

export async function fetchUserStreak(userAddress: string) {
  return getPointsProvider().fetchUserStreak(userAddress);
}

export async function fetchUserRank(userAddress: string) {
  return getPointsProvider().fetchUserRank(userAddress);
}

export function isPointsConfigured() {
  return getPointsProvider().isConfigured();
}

export function isGlobalPointsConfigured() {
  return isGlobalPointsProviderConfigured();
}
