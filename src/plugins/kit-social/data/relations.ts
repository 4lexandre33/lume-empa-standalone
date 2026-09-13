/**
 * Relationship categories as Lume tags.
 * From ShiJbey/TDRS sample traits (stranger, acquaintance, friend, rival)
 * plus `enemy` from the E2 plan. Friendship intensity is the `affinity` stat
 * (TDRS Friendship), not extra tags like good_friend / best_friend.
 */
export const RELATION_CATEGORIES = [
  "stranger",
  "acquaintance",
  "friend",
  "rival",
  "enemy",
] as const;

export type RelationCategory = (typeof RELATION_CATEGORIES)[number];
