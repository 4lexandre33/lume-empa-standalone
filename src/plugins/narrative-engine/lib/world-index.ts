import type { Rule } from "./rule-engine.ts";
import type { SiftPattern } from "./sift.ts";
import { effectiveTags, matchesTag, type CompiledTaxonomy } from "./taxonomy.ts";
import type { Entity, Issue, MatcherAST, WorldModel } from "./types.ts";
import { makeIssue } from "./lexer.ts";
import { matchesEntity } from "./query.ts";

export type WorldIndex = {
  places: string[];
  objects: string[];
  agents: string[];
  rules: { id: string; on: string }[];
  tags: string[];
  channels: string[];
  patterns: string[];
};

function sorted(ids: Iterable<string>): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function isHidden(entity: Entity): boolean {
  return entity.tags.has("hidden") && entity.id === "start";
}

function hasTag(entity: Entity, tag: string, taxonomy: CompiledTaxonomy | null | undefined): boolean {
  return matchesTag(entity, tag, taxonomy);
}

export function buildWorldIndex(
  world: WorldModel,
  rules: readonly Rule[],
  patterns: readonly SiftPattern[] = [],
  taxonomy?: CompiledTaxonomy | null,
): WorldIndex {
  const places: string[] = [];
  const objects: string[] = [];
  const agents: string[] = [];
  const channels: string[] = [];
  const tagSet = new Set<string>();
  for (const [tag] of taxonomy?.parents ?? []) tagSet.add(tag);
  for (const parent of taxonomy?.parents.values() ?? []) tagSet.add(parent);
  for (const entity of world.values()) {
    if (isHidden(entity)) continue;
    for (const tag of effectiveTags(entity.tags, taxonomy)) tagSet.add(tag);
    if (hasTag(entity, "place", taxonomy)) places.push(entity.id);
    if (hasTag(entity, "object", taxonomy)) objects.push(entity.id);
    if (hasTag(entity, "agent", taxonomy)) agents.push(entity.id);
    if (hasTag(entity, "channel", taxonomy)) channels.push(entity.id);
  }
  return {
    places: sorted(places),
    objects: sorted(objects),
    agents: sorted(agents),
    rules: [...rules]
      .sort((a, b) => a.index - b.index)
      .map((rule) => ({ id: rule.id, on: rule.trigger.source })),
    tags: sorted(tagSet),
    channels: sorted(channels),
    patterns: sorted(patterns.map((p) => p.id)),
  };
}

function bullets(ids: readonly string[]): string {
  if (!ids.length) return "- (nenhum)\n";
  return ids.map((id) => `- ${id}`).join("\n") + "\n";
}

export function formatWorldIndex(index: WorldIndex): string {
  const rules = index.rules.length
    ? index.rules.map((r) => `- ${r.id} — ON: ${r.on}`).join("\n") + "\n"
    : "- (nenhuma)\n";
  return [
    "# Índice",
    "",
    "## Salas",
    bullets(index.places).trimEnd(),
    "",
    "## Objectos",
    bullets(index.objects).trimEnd(),
    "",
    "## Agentes",
    bullets(index.agents).trimEnd(),
    "",
    "## Regras",
    rules.trimEnd(),
    "",
    "## Traits",
    bullets(index.tags).trimEnd(),
    "",
    "## Canais",
    bullets(index.channels).trimEnd(),
    "",
    "## Padrões",
    bullets(index.patterns).trimEnd(),
    "",
  ].join("\n");
}

function intentOf(ast: MatcherAST, verb: string): boolean {
  return ast.clauses.some(
    (clause) =>
      !clause.negated &&
      clause.key === "intent" &&
      clause.op === "=" &&
      clause.value?.kind === "id" &&
      clause.value.id === verb,
  );
}

function ruleHasIntent(rule: Rule, verb: string): boolean {
  if (intentOf(rule.trigger, verb)) return true;
  return rule.conditions.some((cond) => intentOf(cond, verb));
}

function rulesMatching(id: string, world: WorldModel, rules: readonly Rule[], taxonomy?: CompiledTaxonomy | null): Rule[] {
  return rules.filter((rule) => matchesEntity(rule.trigger, id, world, id, taxonomy));
}

export function validateWorld(
  world: WorldModel,
  rules: readonly Rule[],
  taxonomy?: CompiledTaxonomy | null,
): Issue[] {
  const issues: Issue[] = [];
  const loc = { file: "entities" as const, line: 1, column: 1 };
  for (const entity of world.values()) {
    if (isHidden(entity)) continue;
    if (hasTag(entity, "topic", taxonomy)) {
      const ask = rulesMatching(entity.id, world, rules, taxonomy).some((rule) => ruleHasIntent(rule, "ask"));
      if (!ask) issues.push(makeIssue("W010", "warning", { id: entity.id }, loc));
    }
    const conv = entity.links.conv;
    if (conv && conv !== "$" && !world.has(conv)) {
      issues.push(makeIssue("W011", "warning", { id: entity.id, target: conv }, loc));
    }
    if (hasTag(entity, "channel", taxonomy)) {
      if (rulesMatching(entity.id, world, rules, taxonomy).length < 2) {
        issues.push(makeIssue("W012", "warning", { id: entity.id }, loc));
      }
    }
    if (hasTag(entity, "vivo", taxonomy)) {
      if (rulesMatching(entity.id, world, rules, taxonomy).length === 0) {
        issues.push(makeIssue("W013", "warning", { id: entity.id }, loc));
      }
    }
  }
  issues.sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  return issues;
}
