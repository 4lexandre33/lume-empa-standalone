import type { GameState } from "../types.ts";

export type PhraseHit = { command: string; dryRun: boolean };
export type PhraseMapper = (text: string, game: GameState) => PhraseHit | null;

const mappers: PhraseMapper[] = [];

export function registerPhraseMapper(mapper: PhraseMapper): () => void {
  if (!mappers.includes(mapper)) mappers.push(mapper);
  return () => {
    const index = mappers.indexOf(mapper);
    if (index >= 0) mappers.splice(index, 1);
  };
}

export function looksLikeIntent(text: string): boolean {
  const head = text.trim().split(";")[0]?.trim() ?? "";
  if (!head) return false;
  return /^intent(?:\.|\s|$)/i.test(head);
}

export function mapPhrase(text: string, game: GameState): PhraseHit | null {
  if (looksLikeIntent(text)) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const mapper of mappers) {
    const hit = mapper(trimmed, game);
    if (hit?.command) return hit;
  }
  return null;
}
