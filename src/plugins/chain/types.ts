import type { GameState } from "../narrative-engine/types.ts";

export type InteractFn = (state: GameState, triggerId: string) => GameState;

export interface ChainService {
  follow(game: GameState, triggerId: string, interact: InteractFn): GameState;
}
