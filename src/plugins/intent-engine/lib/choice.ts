import { matchesTag } from "../../narrative-engine/lib/taxonomy.ts";
import type { GameState } from "../../narrative-engine/types.ts";

/**
 * Map a preview choice (clicked entity) to an Intent command.
 * Buttons stay visible; this is only the translation Button → Intent.
 */
export function commandFromChoice(game: GameState, entityId: string): string | null {
  if (!entityId || entityId === game.playerEntityId) return null;
  const entity = game.worldModel.get(entityId);
  if (!entity) return null;

  const tax = game.taxonomy;
  const actor = game.playerEntityId;
  const here = game.worldModel.get(actor)?.links.current_location ?? null;

  if (matchesTag(entity, "place", tax)) {
    if (entityId === here) return null;
    return `intent.action.move.${entityId}`;
  }
  if (matchesTag(entity, "object", tax)) {
    if (entity.links.current_location === actor) return `intent.action.interact.use.${entityId}`;
    return `intent.action.interact.take.${entityId}`;
  }
  if (matchesTag(entity, "monster", tax)) return `intent.action.interact.attack.${entityId}`;
  if (matchesTag(entity, "agent", tax)) return `intent.action.interact.talk.${entityId}`;
  return null;
}
