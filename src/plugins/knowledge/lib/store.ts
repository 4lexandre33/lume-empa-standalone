import { cloneWorldModel } from "../../narrative-engine/lib/world-model.ts";
import type { GameState, WorldModel } from "../../narrative-engine/types.ts";

export const KNOWS_PREFIX = "knows_";

export function knowledgeTag(factId: string): string {
  return `${KNOWS_PREFIX}${factId}`;
}

export function knows(world: WorldModel, agentId: string, factId: string): boolean {
  return world.get(agentId)?.tags.has(knowledgeTag(factId)) ?? false;
}

export function factsFor(world: WorldModel, agentId: string): string[] {
  const tags = world.get(agentId)?.tags;
  if (!tags) return [];
  return [...tags].filter((tag) => tag.startsWith(KNOWS_PREFIX)).map((tag) => tag.slice(KNOWS_PREFIX.length));
}

export function remember(game: GameState, agentId: string, factId: string): GameState {
  if (!factId || !game.worldModel.get(agentId)) return game;
  if (knows(game.worldModel, agentId, factId)) return game;
  const world = cloneWorldModel(game.worldModel);
  world.get(agentId)!.tags.add(knowledgeTag(factId));
  return { ...game, worldModel: world };
}
