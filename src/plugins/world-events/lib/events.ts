import { cloneWorldModel } from "../../narrative-engine/lib/world-model.ts";
import type { GameState } from "../../narrative-engine/types.ts";

export function ensureEventEntity(game: GameState, eventId: string): GameState {
  if (game.worldModel.has(eventId)) return game;
  const world = cloneWorldModel(game.worldModel);
  world.set(eventId, { id: eventId, tags: new Set(["event"]), stats: {}, links: {} });
  return { ...game, worldModel: world };
}
