import { parseNarrative, pickNarrative } from "./narrative.ts";
import { applyChanges, findMatchingRule, findMatchingRules, type EffectOp, type Rule } from "./rule-engine.ts";
import { entityDescription, type GameState } from "./runtime.ts";
import type { ChangeAST, Entity, WorldModel } from "./types.ts";

export type DryRunCandidate = {
  ruleId: string;
  score: number;
};

export type StatDiff = {
  key: string;
  from: number | null;
  to: number | null;
};

export type LinkDiff = {
  key: string;
  from: string | null;
  to: string | null;
};

export type EntityDiff = {
  id: string;
  tagsAdded: string[];
  tagsRemoved: string[];
  stats: StatDiff[];
  links: LinkDiff[];
};

export type WorldDiff = {
  created: string[];
  destroyed: string[];
  changed: EntityDiff[];
};

export type DryRunReport = {
  triggerId: string;
  matched: boolean;
  ruleId: string | null;
  candidates: DryRunCandidate[];
  cycleIndex: number;
  story: string;
  changes: ChangeAST[];
  effects: EffectOp[];
  worldDiff: WorldDiff;
  wouldMutate: boolean;
};

function sorted(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function isEmptyDiff(diff: EntityDiff): boolean {
  return diff.tagsAdded.length === 0 && diff.tagsRemoved.length === 0 && diff.stats.length === 0 && diff.links.length === 0;
}

function diffEntity(id: string, before: Entity, after: Entity): EntityDiff | null {
  const beforeTags = before.tags;
  const afterTags = after.tags;
  const tagsAdded = sorted([...afterTags].filter((tag) => !beforeTags.has(tag)));
  const tagsRemoved = sorted([...beforeTags].filter((tag) => !afterTags.has(tag)));
  const statKeys = sorted(new Set([...Object.keys(before.stats), ...Object.keys(after.stats)]));
  const stats: StatDiff[] = [];
  for (const key of statKeys) {
    const from = key in before.stats ? before.stats[key]! : null;
    const to = key in after.stats ? after.stats[key]! : null;
    if (from !== to) stats.push({ key, from, to });
  }
  const linkKeys = sorted(new Set([...Object.keys(before.links), ...Object.keys(after.links)]));
  const links: LinkDiff[] = [];
  for (const key of linkKeys) {
    const from = before.links[key] ?? null;
    const to = after.links[key] ?? null;
    if (from !== to) links.push({ key, from, to });
  }
  const diff: EntityDiff = { id, tagsAdded, tagsRemoved, stats, links };
  return isEmptyDiff(diff) ? null : diff;
}

export function diffWorlds(before: WorldModel, after: WorldModel): WorldDiff {
  const created: string[] = [];
  const destroyed: string[] = [];
  const changed: EntityDiff[] = [];
  for (const id of sorted(new Set([...before.keys(), ...after.keys()]))) {
    const prev = before.get(id);
    const next = after.get(id);
    if (!prev && next) created.push(id);
    else if (prev && !next) destroyed.push(id);
    else if (prev && next) {
      const entityDiff = diffEntity(id, prev, next);
      if (entityDiff) changed.push(entityDiff);
    }
  }
  return { created, destroyed, changed };
}

export function worldDiffWouldMutate(diff: WorldDiff): boolean {
  return diff.created.length > 0 || diff.destroyed.length > 0 || diff.changed.length > 0;
}

function candidatesOf(state: GameState, triggerId: string): DryRunCandidate[] {
  return findMatchingRules(triggerId, state.rules, state.worldModel, state.taxonomy).map((match) => ({
    ruleId: match.rule.id,
    score: match.score,
  }));
}

function storyFor(rule: Rule | null, world: WorldModel, triggerId: string, cycleIndex: number, playerId?: string): string {
  if (rule) {
    return parseNarrative(pickNarrative(rule.narrative, rule.voices, world, triggerId, playerId), {
      worldModel: world,
      triggerId,
      cycleIndex,
    });
  }
  return parseNarrative(entityDescription(world, triggerId) || `{${triggerId}.name}`, {
    worldModel: world,
    triggerId,
    cycleIndex,
  });
}

export function dryRunWith(state: GameState, triggerId: string): DryRunReport {
  const world = state.worldModel;
  const candidates = candidatesOf(state, triggerId);
  const rule = findMatchingRule(triggerId, state.rules, world, state.taxonomy);
  const key = rule?.id ?? triggerId;
  const cycleIndex = state.ruleCounts[key] ?? 0;
  const nextWorld = rule ? applyChanges(world, rule.changes, triggerId) : world;
  const worldDiff = diffWorlds(world, nextWorld);
  return {
    triggerId,
    matched: Boolean(rule),
    ruleId: rule?.id ?? null,
    candidates,
    cycleIndex,
    story: storyFor(rule, nextWorld, triggerId, cycleIndex, state.playerEntityId),
    changes: rule ? [...rule.changes] : [],
    effects: rule ? [...rule.effects] : [],
    worldDiff,
    wouldMutate: worldDiffWouldMutate(worldDiff),
  };
}
