import type { GameState } from "../../narrative-engine/types.ts";
import type { InteractFn } from "../types.ts";

export function resolveThenId(raw: string | undefined, triggerId: string): string | null {
  if (!raw) return null;
  const id = raw === "$" ? triggerId : raw;
  return id || null;
}

export function follow(game: GameState, triggerId: string, interact: InteractFn): GameState {
  if (!triggerId) return game;
  return interact(game, triggerId);
}
