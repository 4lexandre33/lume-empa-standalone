/**
 * Narrative functions. Names from sogh (revelation, escalation, confrontation)
 * plus the E5 list (transaction, discovery, curse). Not a classifier.
 */
export const NARRATIVE_FUNCTIONS = [
  "confrontation",
  "transaction",
  "discovery",
  "curse",
  "revelation",
  "escalation",
] as const;

export type NarrativeFunction = (typeof NARRATIVE_FUNCTIONS)[number];
