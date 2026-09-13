import type { GameState } from "../narrative-engine/types.ts";
import type { IntentEffect } from "./lib/command.ts";

export type { IntentEffect };

export interface AgencyService {
  commandFromEffect(args: readonly string[]): IntentEffect | null;
  dispatch(game: GameState, actorId: string, command: string): { game: GameState; executed: boolean };
}
