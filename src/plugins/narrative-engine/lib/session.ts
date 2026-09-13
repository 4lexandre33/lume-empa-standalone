import { cloneWorldModel } from "./world-model.ts";
import { createGame, interactWith, type GameState } from "./runtime.ts";
import type { Rule } from "./rule-engine.ts";
import type { SiftPattern } from "./sift.ts";
import type { CompiledTaxonomy } from "./taxonomy.ts";
import type { Entity, WorldModel } from "./types.ts";

export type SessionEntity = {
  id: string;
  tags: string[];
  stats: Record<string, number>;
  links: Record<string, string>;
  extra?: Record<string, string>;
};

export type SessionJson = {
  seed: string;
  initialWorld: SessionEntity[];
  triggerIds: string[];
};

function entityToSession(entity: Entity): SessionEntity {
  return {
    id: entity.id,
    tags: [...entity.tags].sort(),
    stats: { ...entity.stats },
    links: { ...entity.links },
    extra: entity.extra ? { ...entity.extra } : undefined,
  };
}

export function worldToSession(world: WorldModel): SessionEntity[] {
  return [...world.values()].sort((a, b) => a.id.localeCompare(b.id)).map(entityToSession);
}

export function worldFromSession(entities: readonly SessionEntity[]): WorldModel {
  const world: WorldModel = new Map();
  for (const raw of entities) {
    if (!raw || typeof raw.id !== "string" || !raw.id) continue;
    const entity: Entity = {
      id: raw.id,
      tags: new Set(Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : []),
      stats: raw.stats && typeof raw.stats === "object" ? { ...raw.stats } : {},
      links: raw.links && typeof raw.links === "object" ? { ...raw.links } : {},
      extra: raw.extra && typeof raw.extra === "object" ? { ...raw.extra } : undefined,
    };
    world.set(entity.id, entity);
  }
  return world;
}

export function parseSession(raw: unknown): SessionJson | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.triggerIds) || !Array.isArray(value.initialWorld)) return null;
  const triggerIds = value.triggerIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  const seed = value.seed == null ? "" : String(value.seed);
  return { seed, initialWorld: value.initialWorld as SessionEntity[], triggerIds };
}

export function exportSession(state: GameState): SessionJson {
  return {
    seed: state.seed ?? "",
    initialWorld: worldToSession(state.initialWorld),
    triggerIds: state.history.map((beat) => beat.triggerId),
  };
}

export function replaySession(
  session: SessionJson,
  rules: readonly Rule[],
  playerEntityId = "JOGADOR",
  taxonomy?: CompiledTaxonomy,
  patterns: readonly SiftPattern[] = [],
): GameState {
  const world = cloneWorldModel(worldFromSession(session.initialWorld));
  let game = createGame(world, rules, playerEntityId, taxonomy, patterns, { seed: session.seed });
  for (const id of session.triggerIds) game = interactWith(game, id);
  return game;
}
