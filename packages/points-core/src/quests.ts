import type { JourneyBonus, QuestDefinition, RepeatableActionDefinition, StreakTier } from "./types";

export const SAVER_QUESTS: QuestDefinition[] = [
  { id: "saver_first_shield", name: "First Shield", points: 500, category: "saver" },
  { id: "saver_first_reward_claim", name: "First Reward Claim", points: 300, category: "saver" },
  { id: "saver_first_partial_withdrawal", name: "First Partial Withdrawal", points: 400, category: "saver" },
  { id: "saver_first_full_withdrawal", name: "First Full Withdrawal", points: 500, category: "saver" },
  { id: "saver_activate_shield", name: "Activate Shield", points: 1000, category: "saver" },
  { id: "saver_multi_pool", name: "Multi-Pool Explorer", points: 750, category: "saver" },
];

export const PROTECTOR_QUESTS: QuestDefinition[] = [
  { id: "protector_first_protection", name: "First Protection", points: 500, category: "protector" },
  { id: "protector_first_commission", name: "First Commission Claim", points: 300, category: "protector" },
  { id: "protector_unlock_initiation", name: "Unlock Initiation", points: 400, category: "protector" },
  { id: "protector_unlock_cancellation", name: "Unlock Cancellation", points: 200, category: "protector" },
  { id: "protector_full_withdrawal", name: "Full Protector Withdrawal", points: 500, category: "protector" },
  { id: "protector_multi_pool", name: "Multi-Pool Protector", points: 750, category: "protector" },
];

export const CREATOR_QUESTS: QuestDefinition[] = [
  { id: "creator_pool_architect", name: "Pool Architect", points: 1000, category: "creator" },
  { id: "creator_pool_traction", name: "Pool with Traction", points: 1500, category: "creator" },
  { id: "creator_fee_collector", name: "Fee Collector", points: 300, category: "creator" },
];

export const ALL_QUESTS: QuestDefinition[] = [...SAVER_QUESTS, ...PROTECTOR_QUESTS, ...CREATOR_QUESTS];

export const STREAK_TIERS: StreakTier[] = [
  { minDays: 14, multiplier: "2.0x", name: "Diamond" },
  { minDays: 7, multiplier: "1.5x", name: "Dedicated" },
  { minDays: 3, multiplier: "1.25x", name: "Active" },
  { minDays: 0, multiplier: "1.0x", name: "No bonus" },
];

export const JOURNEY_BONUSES: JourneyBonus[] = [
  { label: "Saver Journey (all 6 quests)", points: 1000, ids: SAVER_QUESTS.map(quest => quest.id) },
  { label: "Protector Journey (all 6 quests)", points: 1000, ids: PROTECTOR_QUESTS.map(quest => quest.id) },
  { label: "Creator Journey (all 3 quests)", points: 500, ids: CREATOR_QUESTS.map(quest => quest.id) },
  { label: "Full Protocol Journey (all 15)", points: 2500, ids: ALL_QUESTS.map(quest => quest.id) },
];

export const REPEATABLE_ACTIONS: RepeatableActionDefinition[] = [
  { id: "saver_deposit", points: 50, dailyCap: 5 },
  { id: "protector_deposit", points: 50, dailyCap: 5 },
  { id: "claim_rewards", points: 25, dailyCap: 3 },
  { id: "claim_commission", points: 25, dailyCap: 3 },
  { id: "partial_withdrawal", points: 25, dailyCap: 3 },
  { id: "full_saver_withdrawal", points: 25, dailyCap: 3 },
  { id: "protector_withdrawal", points: 25, dailyCap: 3 },
  { id: "start_unlock", points: 25, dailyCap: 2 },
  { id: "pay_pool_fee", points: 25, dailyCap: 2 },
  { id: "create_pool", points: 100, dailyCap: 1 },
];
