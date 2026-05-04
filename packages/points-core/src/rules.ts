import { ALL_QUESTS, JOURNEY_BONUSES, REPEATABLE_ACTIONS, STREAK_TIERS } from "./quests";

export const POINTS_RULES_VERSION = "yieldshield-lite-points-v1";

export function getQuestById(questId: string) {
  return ALL_QUESTS.find(quest => quest.id === questId) ?? null;
}

export function getRepeatableActionById(actionId: string) {
  return REPEATABLE_ACTIONS.find(action => action.id === actionId) ?? null;
}

export function getCurrentStreakTier(currentStreakDays: number) {
  return STREAK_TIERS.find(tier => currentStreakDays >= tier.minDays) ?? STREAK_TIERS.at(-1) ?? null;
}

export function getUnlockedJourneyBonuses(completedQuestIds: Iterable<string>) {
  const completed = new Set(completedQuestIds);
  return JOURNEY_BONUSES.filter(bonus => bonus.ids.every(id => completed.has(id)));
}

export function getDateUtcFromIso(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

export function getPreviousDateUtc(dateUtc: string) {
  const [year, month, day] = dateUtc.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  const previousYear = date.getUTCFullYear();
  const previousMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const previousDay = String(date.getUTCDate()).padStart(2, "0");

  return `${previousYear}-${previousMonth}-${previousDay}`;
}
