import type { GameState, WorldModel } from "../narrative-engine/types.ts";

export const PROCESS_TAG = "process";

export type InteractFn = (state: GameState, triggerId: string) => GameState;

export interface ProcessService {
  tag: typeof PROCESS_TAG;
  isProcess(world: WorldModel, id: string): boolean;
  remaining(world: WorldModel, id: string): number | null;
  list(world: WorldModel): string[];
  due(world: WorldModel): string[];
  schedule(game: GameState, id: string, turns: number): GameState;
  tick(game: GameState, interact: InteractFn): GameState;
}
