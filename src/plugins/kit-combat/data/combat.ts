/**
 * Combat tags. Sharpee ext-basic-combat / Ananke: names only, not the 20 Hz loop.
 */
export const COMBAT_TAGS = ["weapon", "hostile", "mortal"] as const;

export type CombatTag = (typeof COMBAT_TAGS)[number];
