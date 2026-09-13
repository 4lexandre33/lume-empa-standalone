import type { Entity, GameState, WorldModel } from "../../narrative-engine/types.ts";
import { MAX_LIVE_PER_BEAT, VIVO_TAG, type InteractFn } from "../types.ts";

function sorted(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Immediate host: held_by → worn_by → on → in → current_location. Does not import spatial. */
export function placeOf(entity: Entity | undefined): string | null {
  if (!entity) return null;
  const links = entity.links ?? {};
  return links.held_by ?? links.worn_by ?? links.on ?? links.in ?? links.current_location ?? null;
}

export function resolveLiveId(raw: string | undefined, triggerId: string): string | null {
  if (!raw) return null;
  const id = raw === "$" ? triggerId : raw;
  return id || null;
}

export function isVivo(world: WorldModel, id: string): boolean {
  return world.get(id)?.tags.has(VIVO_TAG) ?? false;
}

export function listVivosHere(world: WorldModel, observerId: string, triggerId: string): string[] {
  const place = placeOf(world.get(observerId)) ?? placeOf(world.get(triggerId));
  if (!place) return [];
  const ids: string[] = [];
  for (const entity of world.values()) {
    if (!entity.tags.has(VIVO_TAG)) continue;
    if (entity.id === observerId) continue;
    if (entity.id === triggerId) continue;
    if (placeOf(entity) !== place) continue;
    ids.push(entity.id);
  }
  return sorted(ids);
}

export function live(game: GameState, triggerId: string, interact: InteractFn, rawArg?: string): GameState {
  const explicit = resolveLiveId(rawArg, triggerId);
  if (explicit) {
    if (!game.worldModel.has(explicit)) return game;
    return interact(game, explicit);
  }
  const ids = listVivosHere(game.worldModel, game.playerEntityId, triggerId).slice(0, MAX_LIVE_PER_BEAT);
  let current = game;
  for (const id of ids) {
    if (!current.worldModel.has(id)) continue;
    current = interact(current, id);
  }
  return current;
}
