import type { SenseEntity, SenseScope, SenseSpatial, SenseWorld } from "../types.ts";

function hasTag(entity: SenseEntity | undefined, tag: string): boolean {
  if (!entity?.tags) return false;
  if (entity.tags instanceof Set) return entity.tags.has(tag);
  return Array.from(entity.tags).includes(tag);
}

function statOf(entity: SenseEntity | undefined, key: string): number | null {
  const value = entity?.stats?.[key];
  return typeof value === "number" ? value : null;
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function isOpaque(entity: SenseEntity | undefined): boolean {
  return hasTag(entity, "container") && !hasTag(entity, "aberta");
}

export function isLitSource(entity: SenseEntity | undefined): boolean {
  if (!entity) return false;
  if (hasTag(entity, "lit")) return true;
  const lit = statOf(entity, "lit");
  if (lit != null && lit > 0) return true;
  const illumination = statOf(entity, "illumination");
  return illumination != null && illumination > 0;
}

export function isDark(entity: SenseEntity | undefined): boolean {
  if (!entity) return false;
  if (hasTag(entity, "dark")) return true;
  return statOf(entity, "illumination") === 0;
}

export function placeOf(world: SenseWorld, spatial: SenseSpatial, observerId: string): string | null {
  const seen = new Set<string>();
  let current = spatial.locationOf(world, observerId);
  while (current && !seen.has(current)) {
    seen.add(current);
    if (hasTag(world.get(current), "place")) return current;
    current = spatial.locationOf(world, current);
  }
  return spatial.locationOf(world, observerId);
}

function gather(
  world: SenseWorld,
  spatial: SenseSpatial,
  hostId: string,
  throughOpaque: boolean,
  into: string[],
  seen: Set<string>,
): void {
  if (seen.has(hostId)) return;
  seen.add(hostId);
  for (const id of spatial.occupants(world, hostId)) {
    if (hasTag(world.get(id), "hidden")) continue;
    into.push(id);
    if (!throughOpaque && isOpaque(world.get(id))) continue;
    gather(world, spatial, id, throughOpaque, into, seen);
  }
}

function inventoryOf(world: SenseWorld, spatial: SenseSpatial, observerId: string): string[] {
  const ids: string[] = [];
  gather(world, spatial, observerId, false, ids, new Set());
  return uniqueSorted(ids);
}

function lightReaches(world: SenseWorld, spatial: SenseSpatial, placeId: string | null, observerId: string): boolean {
  if (!placeId) return true;
  if (!isDark(world.get(placeId))) return true;
  const reachable: string[] = [];
  gather(world, spatial, placeId, false, reachable, new Set());
  gather(world, spatial, observerId, false, reachable, new Set());
  return reachable.some((id) => isLitSource(world.get(id)));
}

export function visibleTo(world: SenseWorld, spatial: SenseSpatial, observerId: string): string[] {
  const place = placeOf(world, spatial, observerId);
  const inventory = inventoryOf(world, spatial, observerId);
  if (!lightReaches(world, spatial, place, observerId)) {
    return uniqueSorted(inventory.filter((id) => id !== observerId));
  }
  const ids: string[] = [];
  if (place && !hasTag(world.get(place), "hidden")) ids.push(place);
  if (place) gather(world, spatial, place, false, ids, new Set());
  gather(world, spatial, observerId, false, ids, new Set());
  return uniqueSorted(ids.filter((id) => id !== observerId));
}

export function audibleTo(world: SenseWorld, spatial: SenseSpatial, observerId: string): string[] {
  const place = placeOf(world, spatial, observerId);
  const ids: string[] = [];
  if (place && !hasTag(world.get(place), "hidden")) ids.push(place);
  if (place) gather(world, spatial, place, true, ids, new Set());
  gather(world, spatial, observerId, true, ids, new Set());
  return uniqueSorted(ids.filter((id) => id !== observerId));
}

export function reachableTo(world: SenseWorld, spatial: SenseSpatial, observerId: string): string[] {
  const place = placeOf(world, spatial, observerId);
  const ids: string[] = [];
  if (place) gather(world, spatial, place, false, ids, new Set());
  gather(world, spatial, observerId, false, ids, new Set());
  return uniqueSorted(ids.filter((id) => id !== observerId));
}

export function canSee(world: SenseWorld, spatial: SenseSpatial, observerId: string, targetId: string): boolean {
  if (observerId === targetId) return true;
  return visibleTo(world, spatial, observerId).includes(targetId);
}

export function canHear(world: SenseWorld, spatial: SenseSpatial, observerId: string, targetId: string): boolean {
  if (observerId === targetId) return true;
  return audibleTo(world, spatial, observerId).includes(targetId);
}

export function canTouch(world: SenseWorld, spatial: SenseSpatial, observerId: string, targetId: string): boolean {
  if (observerId === targetId) return true;
  return reachableTo(world, spatial, observerId).includes(targetId);
}

export function scope(world: SenseWorld, spatial: SenseSpatial, observerId: string): SenseScope {
  const place = placeOf(world, spatial, observerId);
  return {
    place,
    see: visibleTo(world, spatial, observerId),
    hear: audibleTo(world, spatial, observerId),
    touch: reachableTo(world, spatial, observerId),
    inventory: inventoryOf(world, spatial, observerId),
    lit: lightReaches(world, spatial, place, observerId),
  };
}

export function bindSenses(spatial: SenseSpatial) {
  return {
    isOpaque,
    isLitSource,
    isDark,
    placeOf: (world: SenseWorld, observerId: string) => placeOf(world, spatial, observerId),
    visibleTo: (world: SenseWorld, observerId: string) => visibleTo(world, spatial, observerId),
    audibleTo: (world: SenseWorld, observerId: string) => audibleTo(world, spatial, observerId),
    reachableTo: (world: SenseWorld, observerId: string) => reachableTo(world, spatial, observerId),
    canSee: (world: SenseWorld, observerId: string, targetId: string) => canSee(world, spatial, observerId, targetId),
    canHear: (world: SenseWorld, observerId: string, targetId: string) => canHear(world, spatial, observerId, targetId),
    canTouch: (world: SenseWorld, observerId: string, targetId: string) => canTouch(world, spatial, observerId, targetId),
    scope: (world: SenseWorld, observerId: string) => scope(world, spatial, observerId),
  };
}
