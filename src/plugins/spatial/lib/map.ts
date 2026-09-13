import { exits, inOf, locationOf } from "./space.ts";
import type { SpatialEntity, SpatialWorld } from "../types.ts";

export type MapRoom = { id: string; x: number; y: number };
export type MapLink = { from: string; to: string; dir: string; via: "exit" | "connector" | "in" };
export type SpatialMap = { rooms: MapRoom[]; links: MapLink[] };

const OPPOSITE: Record<string, string> = {
  n: "s",
  s: "n",
  e: "w",
  w: "e",
  ne: "sw",
  sw: "ne",
  nw: "se",
  se: "nw",
  u: "d",
  d: "u",
  in: "out",
  out: "in",
};

const DELTA: Record<string, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
  ne: [1, -1],
  nw: [-1, -1],
  se: [1, 1],
  sw: [-1, 1],
  u: [0, -1],
  d: [0, 1],
  in: [1, 1],
  out: [-1, -1],
};

function hasTag(entity: SpatialEntity, tag: string): boolean {
  const tags = entity.tags;
  if (!tags) return false;
  if (tags instanceof Set) return tags.has(tag);
  return Array.from(tags).includes(tag);
}

export function isPlace(entity: SpatialEntity | undefined): boolean {
  return !!entity && hasTag(entity, "place");
}

export function placesOf(world: SpatialWorld): string[] {
  const ids: string[] = [];
  for (const entity of world.values()) {
    if (isPlace(entity)) ids.push(entity.id);
  }
  return ids.sort((a, b) => a.localeCompare(b));
}

function placeSet(world: SpatialWorld): Set<string> {
  return new Set(placesOf(world));
}

export function linksOf(world: SpatialWorld): MapLink[] {
  const places = placeSet(world);
  const found: MapLink[] = [];
  const seen = new Set<string>();
  const push = (link: MapLink) => {
    const key = `${link.from}|${link.dir}|${link.to}|${link.via}`;
    if (seen.has(key) || !places.has(link.from) || !places.has(link.to) || link.from === link.to) return;
    seen.add(key);
    found.push(link);
  };
  for (const id of places) {
    for (const exit of exits(world, id)) {
      push({ from: id, to: exit.to, dir: exit.dir, via: exit.via });
    }
    const entity = world.get(id);
    const host = entity ? inOf(entity) : null;
    if (host && places.has(host)) push({ from: host, to: id, dir: "in", via: "in" });
  }
  found.sort((a, b) => {
    const from = a.from.localeCompare(b.from);
    if (from) return from;
    const dir = a.dir.localeCompare(b.dir);
    if (dir) return dir;
    const to = a.to.localeCompare(b.to);
    if (to) return to;
    return a.via.localeCompare(b.via);
  });
  return found;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function findFree(x: number, y: number, taken: Set<string>): { x: number; y: number } {
  if (!taken.has(cellKey(x, y))) return { x, y };
  for (let radius = 1; radius <= 12; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!taken.has(cellKey(nx, ny))) return { x: nx, y: ny };
      }
    }
  }
  return { x, y: y + 13 };
}

export function graphOf(world: SpatialWorld): SpatialMap {
  const ids = placesOf(world);
  const links = linksOf(world);
  const outgoing = new Map<string, MapLink[]>();
  for (const id of ids) outgoing.set(id, []);
  for (const link of links) {
    outgoing.get(link.from)?.push(link);
    const backDir = OPPOSITE[link.dir] ?? "";
    outgoing.get(link.to)?.push({ from: link.to, to: link.from, dir: backDir, via: link.via });
  }

  const pos = new Map<string, { x: number; y: number }>();
  const taken = new Set<string>();
  const unplaced = new Set(ids);
  let originX = 0;

  while (unplaced.size) {
    const start = [...unplaced][0]!;
    const seed = findFree(originX, 0, taken);
    pos.set(start, seed);
    taken.add(cellKey(seed.x, seed.y));
    unplaced.delete(start);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      const here = pos.get(id)!;
      for (const link of outgoing.get(id) ?? []) {
        if (pos.has(link.to)) continue;
        const [dx, dy] = DELTA[link.dir] ?? [1, 0];
        const next = findFree(here.x + dx, here.y + dy, taken);
        pos.set(link.to, next);
        taken.add(cellKey(next.x, next.y));
        unplaced.delete(link.to);
        queue.push(link.to);
      }
    }
    let maxX = originX;
    for (const room of pos.values()) if (room.x > maxX) maxX = room.x;
    originX = maxX + 2;
  }

  const rooms = ids.map((id) => ({ id, x: pos.get(id)?.x ?? 0, y: pos.get(id)?.y ?? 0 }));
  return { rooms, links };
}

export function placeOf(world: SpatialWorld, id: string): string | null {
  const places = placeSet(world);
  if (places.has(id)) return id;
  const seen = new Set<string>();
  let current = locationOf(world, id);
  while (current && !seen.has(current)) {
    if (places.has(current)) return current;
    seen.add(current);
    current = locationOf(world, current);
  }
  return null;
}
