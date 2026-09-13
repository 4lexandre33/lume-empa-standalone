export type SenseWorld = {
  get(id: string): SenseEntity | undefined;
  values(): Iterable<SenseEntity>;
};

export type SenseEntity = {
  id: string;
  links: Record<string, string>;
  tags?: ReadonlySet<string> | readonly string[];
  stats?: Record<string, number>;
};

export type SenseSpatial = {
  locationOf(world: SenseWorld, id: string): string | null;
  occupants(world: SenseWorld, hostId: string): string[];
};

export type SenseKind = "see" | "hear" | "touch";

export type SenseScope = {
  place: string | null;
  see: string[];
  hear: string[];
  touch: string[];
  inventory: string[];
  lit: boolean;
};

export interface SensesService {
  isOpaque(entity: SenseEntity | undefined): boolean;
  isLitSource(entity: SenseEntity | undefined): boolean;
  isDark(entity: SenseEntity | undefined): boolean;
  placeOf(world: SenseWorld, observerId: string): string | null;
  visibleTo(world: SenseWorld, observerId: string): string[];
  audibleTo(world: SenseWorld, observerId: string): string[];
  reachableTo(world: SenseWorld, observerId: string): string[];
  canSee(world: SenseWorld, observerId: string, targetId: string): boolean;
  canHear(world: SenseWorld, observerId: string, targetId: string): boolean;
  canTouch(world: SenseWorld, observerId: string, targetId: string): boolean;
  scope(world: SenseWorld, observerId: string): SenseScope;
}
