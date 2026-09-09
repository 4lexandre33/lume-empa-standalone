import { makeIssue, stripLineComment } from "./lexer.ts";
import type { Entity, Issue, MatcherAST, WorldModel } from "./types.ts";

export type TagId = string;
export type TagTaxonomy = Map<TagId, TagId>;
export type TagMatchMode = "direct" | "effective";

export type CompiledTaxonomy = {
  parents: TagTaxonomy;
  ancestors: Map<TagId, string[]>;
  declaredAt: Map<TagId, number>;
  errors: Issue[];
  warnings: Issue[];
};

export type TaxonomyNode = { tag: string; line: number; children: TaxonomyNode[] };

export type TagMatchExplain = {
  matched: boolean;
  direct: boolean;
  path: string[];
  reason: string;
};

export type TagImpact = {
  tag: string;
  entitiesDirect: string[];
  entitiesInherited: string[];
  rules: { id: string; line: number; role: "on" | "if" }[];
};

const FILE = "taxonomy";
const IDENT_RE = /^[\p{L}_][\p{L}\p{N}\p{M}_]*$/u;
const LINE_RE = /^([\p{L}_][\p{L}\p{N}\p{M}_]*)\s*(→|->)\s*([\p{L}_][\p{L}\p{N}\p{M}_]*)$/u;
const NEVER_INHERIT = new Set(["hidden"]);

export const EMPTY_TAXONOMY: CompiledTaxonomy = {
  parents: new Map(),
  ancestors: new Map(),
  declaredAt: new Map(),
  errors: [],
  warnings: [],
};

export function emptyTaxonomy(): CompiledTaxonomy {
  return EMPTY_TAXONOMY;
}

function lineBody(raw: string): string {
  const { code } = stripLineComment(raw);
  const hash = code.indexOf("#");
  return (hash >= 0 ? code.slice(0, hash) : code).trim();
}

function ancestorsOf(tag: string, parents: TagTaxonomy): string[] {
  const out: string[] = [];
  const seen = new Set<string>([tag]);
  let cur = parents.get(tag);
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    out.push(cur);
    cur = parents.get(cur);
  }
  return out;
}

function findCycle(parents: TagTaxonomy): string[] | null {
  const done = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): string[] | null {
    if (done.has(node)) return null;
    if (visiting.has(node)) {
      const i = stack.indexOf(node);
      return i >= 0 ? [...stack.slice(i), node] : [node, node];
    }
    visiting.add(node);
    stack.push(node);
    const parent = parents.get(node);
    if (parent) {
      const cycle = dfs(parent);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    done.add(node);
    return null;
  }

  for (const node of parents.keys()) {
    const cycle = dfs(node);
    if (cycle) return cycle;
  }
  return null;
}

export function compileTaxonomy(source: string): CompiledTaxonomy {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const parents: TagTaxonomy = new Map();
  const seenAt = new Map<string, number>();
  const declaredAt = new Map<string, number>();
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const trimmed = lineBody(lines[i] ?? "");
    if (!trimmed) continue;
    const raw = lines[i] ?? "";
    const endColumn = Math.max(2, raw.length + 1);
    const m = trimmed.match(LINE_RE);
    if (!m || !IDENT_RE.test(m[1] ?? "") || !IDENT_RE.test(m[3] ?? "")) {
      errors.push(makeIssue("E013", "error", { detail: trimmed }, { file: FILE, line: lineNo, column: 1, endColumn }));
      continue;
    }
    const child = m[1]!;
    const parent = m[3]!;
    if (child === parent) {
      errors.push(makeIssue("E011", "error", { tag: child }, { file: FILE, line: lineNo, column: 1, endColumn }));
      continue;
    }
    const prev = seenAt.get(child);
    if (prev != null) {
      errors.push(makeIssue("E010", "error", { tag: child }, { file: FILE, line: lineNo, column: 1, endColumn }));
      continue;
    }
    seenAt.set(child, lineNo);
    parents.set(child, parent);
    if (!declaredAt.has(child)) declaredAt.set(child, lineNo);
    if (!declaredAt.has(parent)) declaredAt.set(parent, lineNo);
  }

  const cycle = findCycle(parents);
  if (cycle) {
    const line = seenAt.get(cycle[0]!) ?? 1;
    errors.push(makeIssue("E012", "error", { chain: cycle.join(" → ") }, { file: FILE, line, column: 1 }));
  }

  const tags = new Set<string>([...parents.keys(), ...parents.values()]);
  const ancestors = new Map<TagId, string[]>();
  for (const tag of tags) ancestors.set(tag, ancestorsOf(tag, parents));

  return { parents, ancestors, declaredAt, errors, warnings };
}

export function depthOf(tag: string, taxonomy?: CompiledTaxonomy | null): number {
  if (!taxonomy || taxonomy.parents.size === 0) return 0;
  const cached = taxonomy.ancestors.get(tag);
  if (cached) return cached.length;
  return ancestorsOf(tag, taxonomy.parents).length;
}

export function effectiveTags(direct: Iterable<string>, taxonomy?: CompiledTaxonomy | null): Set<string> {
  const out = new Set(direct);
  if (!taxonomy || taxonomy.parents.size === 0) return out;
  for (const tag of direct) {
    const list = taxonomy.ancestors.get(tag) ?? ancestorsOf(tag, taxonomy.parents);
    for (const ancestor of list) {
      if (NEVER_INHERIT.has(ancestor)) continue;
      out.add(ancestor);
    }
  }
  return out;
}

export function matchesTag(
  entity: Entity,
  tag: string,
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): boolean {
  if (entity.tags.has(tag)) return true;
  if (mode === "direct" || NEVER_INHERIT.has(tag)) return false;
  if (!taxonomy || taxonomy.parents.size === 0) return false;
  return effectiveTags(entity.tags, taxonomy).has(tag);
}

export function inheritedTags(entity: Entity, taxonomy?: CompiledTaxonomy | null): string[] {
  const direct = entity.tags;
  const all = effectiveTags(direct, taxonomy);
  return [...all].filter((tag) => !direct.has(tag));
}

export function explainTagMatch(entity: Entity, tag: string, taxonomy?: CompiledTaxonomy | null): TagMatchExplain {
  if (entity.tags.has(tag)) {
    return { matched: true, direct: true, path: [tag], reason: `${entity.id} tem a tag ${tag}` };
  }
  if (NEVER_INHERIT.has(tag)) {
    return { matched: false, direct: false, path: [], reason: `${tag} nunca é herdada` };
  }
  if (!taxonomy || taxonomy.parents.size === 0) {
    return { matched: false, direct: false, path: [], reason: `${entity.id} não tem a tag ${tag}` };
  }
  for (const d of entity.tags) {
    const chain = [d, ...(taxonomy.ancestors.get(d) ?? ancestorsOf(d, taxonomy.parents))];
    const i = chain.indexOf(tag);
    if (i > 0) {
      const path = chain.slice(0, i + 1);
      return { matched: true, direct: false, path, reason: `${tag} é ancestral de ${d}` };
    }
  }
  return { matched: false, direct: false, path: [], reason: `${entity.id} não casa com ${tag}` };
}

export function taxonomyForest(taxonomy?: CompiledTaxonomy | null): TaxonomyNode[] {
  if (!taxonomy || taxonomy.parents.size === 0) return [];
  const tax = taxonomy;
  const kids = new Map<string, string[]>();
  const all = new Set<string>();
  for (const [child, parent] of tax.parents) {
    all.add(child);
    all.add(parent);
    const list = kids.get(parent) ?? [];
    list.push(child);
    kids.set(parent, list);
  }
  const byLine = (a: string, b: string) =>
    (tax.declaredAt.get(a) ?? 0) - (tax.declaredAt.get(b) ?? 0) || a.localeCompare(b);
  for (const list of kids.values()) list.sort(byLine);
  const roots = [...all].filter((t) => !tax.parents.has(t)).sort(byLine);
  function node(tag: string): TaxonomyNode {
    return {
      tag,
      line: tax.declaredAt.get(tag) ?? 1,
      children: (kids.get(tag) ?? []).map(node),
    };
  }
  return roots.map(node);
}

function matcherUsesTag(ast: MatcherAST, tag: string): boolean {
  return ast.clauses.some((c) => !c.op && c.key === tag);
}

export function impactOfTag(
  tag: string,
  world: WorldModel,
  rules: readonly { id: string; startLine: number; trigger: MatcherAST; conditions: MatcherAST[] }[],
  taxonomy?: CompiledTaxonomy | null,
): TagImpact {
  const entitiesDirect: string[] = [];
  const entitiesInherited: string[] = [];
  for (const entity of world.values()) {
    if (entity.id === "start") continue;
    if (entity.tags.has(tag)) entitiesDirect.push(entity.id);
    else if (matchesTag(entity, tag, taxonomy, "effective")) entitiesInherited.push(entity.id);
  }
  const seen = new Set<string>();
  const hit: TagImpact["rules"] = [];
  for (const rule of rules) {
    if (matcherUsesTag(rule.trigger, tag) && !seen.has(rule.id)) {
      seen.add(rule.id);
      hit.push({ id: rule.id, line: rule.startLine, role: "on" });
    }
    if (rule.conditions.some((c) => matcherUsesTag(c, tag)) && !seen.has(rule.id)) {
      seen.add(rule.id);
      hit.push({ id: rule.id, line: rule.startLine, role: "if" });
    }
  }
  return { tag, entitiesDirect, entitiesInherited, rules: hit };
}
