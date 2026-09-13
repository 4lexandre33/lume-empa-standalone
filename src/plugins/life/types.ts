import type { GameState, WorldModel } from "../narrative-engine/types.ts";

export const VIVO_TAG = "vivo";

export const MAX_LIVE_PER_BEAT = 4;

export type InteractFn = (state: GameState, triggerId: string) => GameState;

export interface LifeService {
  tag: typeof VIVO_TAG;
  maxPerBeat: typeof MAX_LIVE_PER_BEAT;
  isVivo(world: WorldModel, id: string): boolean;
  listHere(world: WorldModel, observerId: string, triggerId: string): string[];
  live(game: GameState, triggerId: string, interact: InteractFn, rawArg?: string): GameState;
}
