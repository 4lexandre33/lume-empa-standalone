import type { SpatialMap } from "./lib/map.ts";

export type SpatialRelation = "in" | "on" | "held_by" | "worn_by";

export type ExitDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "u" | "d" | "in" | "out";

export type SpatialEntity = {
  id: string;
  links: Record<string, string>;
  tags?: ReadonlySet<string> | readonly string[];
};

export type SpatialWorld = {
  get(id: string): SpatialEntity | undefined;
  values(): Iterable<SpatialEntity>;
};

export type SpatialExit = {
  dir: string;
  to: string;
  via: "exit" | "connector";
};

export type SpatialConnector = {
  id: string;
  from: string;
  to: string;
  dir: string | null;
};

export interface SpatialService {
  inOf(entity: SpatialEntity): string | null;
  locationOf(world: SpatialWorld, id: string): string | null;
  relationOf(world: SpatialWorld, id: string): SpatialRelation | null;
  contents(world: SpatialWorld, hostId: string): string[];
  contentsOn(world: SpatialWorld, hostId: string): string[];
  heldBy(world: SpatialWorld, hostId: string): string[];
  wornBy(world: SpatialWorld, hostId: string): string[];
  occupants(world: SpatialWorld, hostId: string): string[];
  chain(world: SpatialWorld, id: string): string[];
  deepContains(world: SpatialWorld, hostId: string, itemId: string): boolean;
  exits(world: SpatialWorld, placeId: string): SpatialExit[];
  connectorsFrom(world: SpatialWorld, placeId: string): SpatialConnector[];
  destination(world: SpatialWorld, placeId: string, dir: string): string | null;
  graphOf(world: SpatialWorld): SpatialMap;
  placeOf(world: SpatialWorld, id: string): string | null;
}
