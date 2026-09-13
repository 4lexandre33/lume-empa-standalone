import { cloneWorldModel } from "../../narrative-engine/lib/world-model.ts";
import type { GameState, WorldModel } from "../../narrative-engine/types.ts";
import { PROCESS_TAG, type InteractFn } from "../types.ts";

function sorted(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function isProcess(world: WorldModel, id: string): boolean {
  return world.get(id)?.tags.has(PROCESS_TAG) ?? false;
}

export function remainingOf(world: WorldModel, id: string): number | null {
  const entity = world.get(id);
  if (!entity?.tags.has(PROCESS_TAG)) return null;
  const value = entity.stats.remaining;
  return typeof value === "number" ? value : 0;
}

export function listProcesses(world: WorldModel): string[] {
  const ids: string[] = [];
  for (const entity of world.values()) {
    if (entity.tags.has(PROCESS_TAG)) ids.push(entity.id);
  }
  return sorted(ids);
}

export function dueProcesses(world: WorldModel): string[] {
  return listProcesses(world).filter((id) => (remainingOf(world, id) ?? 1) <= 0);
}

export function schedule(game: GameState, id: string, turns: number): GameState {
  if (!id) return game;
  if (!Number.isFinite(turns)) return game;
  const remaining = Math.max(0, Math.floor(turns));
  const world = cloneWorldModel(game.worldModel);
  const existing = world.get(id);
  if (existing) {
    existing.tags.add(PROCESS_TAG);
    existing.stats.remaining = remaining;
  } else {
    world.set(id, { id, tags: new Set([PROCESS_TAG]), stats: { remaining }, links: {} });
  }
  return { ...game, worldModel: world };
}

export function advanceRemaining(game: GameState): GameState {
  const ids = listProcesses(game.worldModel);
  if (ids.length === 0) return game;
  const world = cloneWorldModel(game.worldModel);
  let changed = false;
  for (const id of ids) {
    const entity = world.get(id);
    if (!entity) continue;
    const remaining = typeof entity.stats.remaining === "number" ? entity.stats.remaining : 0;
    if (remaining > 0) {
      entity.stats.remaining = remaining - 1;
      changed = true;
    }
  }
  return changed ? { ...game, worldModel: world } : game;
}

export function tick(game: GameState, interact: InteractFn): GameState {
  let current = advanceRemaining(game);
  for (const id of dueProcesses(current.worldModel)) {
    if (!current.worldModel.has(id)) continue;
    current = interact(current, id);
  }
  return current;
}
