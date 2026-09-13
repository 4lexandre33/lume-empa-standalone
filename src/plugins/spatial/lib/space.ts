import type {
  ExitDir,
  SpatialConnector,
  SpatialEntity,
  SpatialExit,
  SpatialRelation,
  SpatialWorld,
} from "../types.ts";

export const IN_ALIAS = "current_location";

export const EXIT_DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw", "u", "d", "in", "out"] as const;

const PARENT_ORDER: SpatialRelation[] = ["held_by", "worn_by", "on", "in"];

function linksOf(entity: SpatialEntity): Record<string, string> {
  return entity.links ?? {};
}

function hasTag(entity: SpatialEntity, tag: string): boolean {
  const tags = entity.tags;
  if (!tags) return false;
  if (tags instanceof Set) return tags.has(tag);
  return Array.from(tags).includes(tag);
}

function sorted(ids: string[]): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** `in`, else read-alias `current_location`. */
export function inOf(entity: SpatialEntity): string | null {
  const links = linksOf(entity);
  return links.in ?? links[IN_ALIAS] ?? null;
}

export function relationOf(world: SpatialWorld, id: string): SpatialRelation | null {
  const entity = world.get(id);
  if (!entity) return null;
  const links = linksOf(entity);
  for (const relation of PARENT_ORDER) {
    if (relation === "in") {
      if (links.in || links[IN_ALIAS]) return "in";
      continue;
    }
    if (links[relation]) return relation;
  }
  return null;
}

/** Immediate spatial host: held_by → worn_by → on → in → current_location. */
export function locationOf(world: SpatialWorld, id: string): string | null {
  const entity = world.get(id);
  if (!entity) return null;
  const links = linksOf(entity);
  return links.held_by ?? links.worn_by ?? links.on ?? links.in ?? links[IN_ALIAS] ?? null;
}

function collect(world: SpatialWorld, hostId: string, matches: (entity: SpatialEntity) => boolean): string[] {
  const ids: string[] = [];
  for (const entity of world.values()) {
    if (entity.id === hostId) continue;
    if (matches(entity)) ids.push(entity.id);
  }
  return sorted(ids);
}

/** Direct `in` (with current_location alias). Not on/held/worn. */
export function contents(world: SpatialWorld, hostId: string): string[] {
  return collect(world, hostId, (entity) => inOf(entity) === hostId);
}

export function contentsOn(world: SpatialWorld, hostId: string): string[] {
  return collect(world, hostId, (entity) => linksOf(entity).on === hostId);
}

export function heldBy(world: SpatialWorld, hostId: string): string[] {
  return collect(world, hostId, (entity) => linksOf(entity).held_by === hostId);
}

export function wornBy(world: SpatialWorld, hostId: string): string[] {
  return collect(world, hostId, (entity) => linksOf(entity).worn_by === hostId);
}

/** Anything whose immediate host is this id (all four relations). */
export function occupants(world: SpatialWorld, hostId: string): string[] {
  return collect(world, hostId, (entity) => {
    const links = linksOf(entity);
    return (
      links.held_by === hostId ||
      links.worn_by === hostId ||
      links.on === hostId ||
      inOf(entity) === hostId
    );
  });
}

export function chain(world: SpatialWorld, id: string): string[] {
  const seen = new Set<string>();
  const ancestors: string[] = [];
  let current = locationOf(world, id);
  while (current && !seen.has(current)) {
    seen.add(current);
    ancestors.push(current);
    current = locationOf(world, current);
  }
  return ancestors;
}

export function deepContains(world: SpatialWorld, hostId: string, itemId: string): boolean {
  if (hostId === itemId) return false;
  return chain(world, itemId).includes(hostId);
}

export function isExitDir(value: string): value is ExitDir {
  return (EXIT_DIRS as readonly string[]).includes(value);
}

export function exitKey(dir: string): string {
  return `exit_${dir.toLowerCase()}`;
}

export function exits(world: SpatialWorld, placeId: string): SpatialExit[] {
  const place = world.get(placeId);
  const found: SpatialExit[] = [];
  const seen = new Set<string>();
  const push = (dir: string, to: string, via: SpatialExit["via"]) => {
    const key = `${dir}:${to}:${via}`;
    if (seen.has(key) || !to) return;
    seen.add(key);
    found.push({ dir, to, via });
  };
  if (place) {
    const links = linksOf(place);
    for (const dir of EXIT_DIRS) {
      const to = links[exitKey(dir)];
      if (to) push(dir, to, "exit");
    }
  }
  for (const connector of connectorsFrom(world, placeId)) {
    push(connector.dir ?? "", connector.to, "connector");
  }
  found.sort((a, b) => {
    const dir = a.dir.localeCompare(b.dir);
    if (dir !== 0) return dir;
    const to = a.to.localeCompare(b.to);
    if (to !== 0) return to;
    return a.via.localeCompare(b.via);
  });
  return found;
}

export function connectorsFrom(world: SpatialWorld, placeId: string): SpatialConnector[] {
  const found: SpatialConnector[] = [];
  for (const entity of world.values()) {
    if (!hasTag(entity, "connector")) continue;
    const links = linksOf(entity);
    if (links.from !== placeId || !links.to) continue;
    const dir = links.dir ?? null;
    found.push({ id: entity.id, from: placeId, to: links.to, dir });
  }
  found.sort((a, b) => a.id.localeCompare(b.id));
  return found;
}

export function destination(world: SpatialWorld, placeId: string, dir: string): string | null {
  const normalized = dir.toLowerCase();
  const place = world.get(placeId);
  if (place) {
    const linked = linksOf(place)[exitKey(normalized)];
    if (linked) return linked;
  }
  const match = connectorsFrom(world, placeId).find((connector) => connector.dir === normalized);
  return match?.to ?? null;
}
