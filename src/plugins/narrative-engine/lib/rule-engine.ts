import { makeIssue, ParseError, stripLineComment, tokenize, TokenCursor } from "./lexer.ts";
import { matchesEntity, parseMatcher, queryHasResults, specificityOf } from "./query.ts";
import type { CompiledTaxonomy } from "./taxonomy.ts";
import type { ChangeAST, ChangeField, ChangeTarget, Entity, Issue, MatcherAST, Token, WorldModel } from "./types.ts";
import { cloneEntity, cloneWorldModel, parseDottedEntity } from "./world-model.ts";

export const SEMANTIC_KINDS = [
  "constraint",
  "transformation",
  "lifecycle",
  "relation",
  "cognition",
  "agency",
  "process",
] as const;

export type SemanticKind = (typeof SEMANTIC_KINDS)[number];

export type EffectOp = {
  verb: string;
  args: string[];
  source: string;
  line: number;
};

export type Rule = {
  id: string;
  index: number;
  trigger: MatcherAST;
  conditions: MatcherAST[];
  changes: ChangeAST[];
  effects: EffectOp[];
  semantics: SemanticKind[];
  funcao: string;
  narrative: string;
  voices: Record<string, string>;
  source: string;
  startLine: number;
};

export type RuleMatch = { rule: Rule; score: number };

export type DoLine = { change?: ChangeAST; effect?: EffectOp };

const KW_RE = /^(ON|IF|DO|NARRATIVA|NARRATIVE|SEMANTIC|SEMANTICS|FUNCAO|FUNÇÃO|FUNCTION)\s*:/i;
const EFFECT_VERBS = new Set(["EMIT", "INTENT", "KNOW", "WAIT", "TICK", "THEN", "LIVE"]);
const EFFECT_ALLOW_EMPTY = new Set(["TICK", "LIVE"]);
const WORLD_VERBS = new Set(["CREATE", "DESTROY"]);
const SEMANTIC_SET = new Set<string>(SEMANTIC_KINDS);

function fail(detail: string, t: Token, file = "rules"): never {
  throw new ParseError(makeIssue("E000", "error", { detail }, { file, line: t.line, column: t.column }));
}

function parseLinkLookup(cur: TokenCursor, file: string): { entityId: string; key: string } {
  cur.expect("LPAREN", file, "esperado (");
  const kw = cur.expect("IDENT", file, "esperado 'link'");
  if (kw.value.toLowerCase() !== "link") fail("esperado 'link'", kw, file);
  const idTok = cur.at("DOLLAR") ? cur.consume() : cur.expect("IDENT", file, "esperado id");
  cur.expect("DOT", file, "esperado . depois do id no lookup");
  const keyTok = cur.expect("IDENT", file, "esperado chave do link");
  cur.expect("RPAREN", file, "esperado )");
  return { entityId: idTok.value, key: keyTok.value };
}

function parseTarget(cur: TokenCursor, file: string): ChangeTarget {
  if (cur.at("DOLLAR")) {
    cur.consume();
    return { kind: "trigger" };
  }
  if (cur.at("LPAREN")) {
    const look = parseLinkLookup(cur, file);
    return { kind: "linkLookup", entityId: look.entityId, key: look.key };
  }
  const t = cur.expect("IDENT", file, "esperado id alvo");
  return { kind: "id", id: t.value };
}

export function parseChangeLine(source: string, options: { file?: string; startLine?: number } = {}): ChangeAST {
  const file = options.file ?? "rules";
  const startLine = options.startLine ?? 1;
  const tokens = tokenize(source.trim(), { file, startLine });
  const cur = new TokenCursor(tokens);
  const target = parseTarget(cur, file);
  const fields: ChangeField[] = [];
  while (cur.at("DOT")) {
    cur.consume();
    if (cur.at("MINUS")) {
      cur.consume();
      const tag = cur.expect("IDENT", file, "esperado tag para remover");
      fields.push({ kind: "removeTag", tag: tag.value });
      continue;
    }
    const keyTok = cur.expect("IDENT", file, "esperado campo");
    if (cur.at("EQ")) {
      cur.consume();
      const v = cur.peek();
      if (v.kind === "NUMBER") {
        cur.consume();
        fields.push({ kind: "setStat", key: keyTok.value, value: v.number ?? Number(v.value) });
      } else if (v.kind === "LPAREN") {
        const look = parseLinkLookup(cur, file);
        fields.push({ kind: "setLink", key: keyTok.value, value: { kind: "linkLookup", entityId: look.entityId, key: look.key } });
      } else if (v.kind === "DOLLAR" || v.kind === "IDENT") {
        cur.consume();
        fields.push({ kind: "setLink", key: keyTok.value, value: v.kind === "DOLLAR" ? { kind: "trigger" } : { kind: "id", id: v.value } });
      } else fail("esperado número ou id", v, file);
    } else if (cur.at("PLUS") || cur.at("MINUS")) {
      const sign = cur.consume().kind === "MINUS" ? -1 : 1;
      if (cur.at("NUMBER")) {
        const n = cur.consume();
        fields.push({ kind: "deltaStat", key: keyTok.value, delta: sign * (n.number ?? Number(n.value)) });
      } else {
        const from = parseTarget(cur, file);
        cur.expect("DOT", file, "esperado .stat da origem");
        const statTok = cur.expect("IDENT", file, "esperado stat da origem");
        fields.push({ kind: "deltaStatFrom", key: keyTok.value, sign, from, stat: statTok.value });
      }
    } else if (cur.at("STAR")) {
      cur.consume();
      const n = cur.expect("NUMBER", file, "esperado fator");
      fields.push({ kind: "mulStat", key: keyTok.value, factor: n.number ?? Number(n.value) });
    } else {
      fields.push({ kind: "addTag", tag: keyTok.value });
    }
  }
  return { target, fields, source: source.trim(), line: startLine };
}

function parseVerbRest(source: string): { verb: string; rest: string } | null {
  const trimmed = source.trim();
  const m = trimmed.match(/^([A-Za-z_][\w]*)\b/);
  if (!m) return null;
  return { verb: m[1]!.toUpperCase(), rest: trimmed.slice(m[0].length).trim() };
}

function parseCreateLine(rest: string, source: string, startLine: number): ChangeAST {
  if (!rest) {
    throw new ParseError(makeIssue("E000", "error", { detail: "CREATE requer um id" }, { file: "rules", line: startLine, column: 1 }));
  }
  const entity = parseDottedEntity(rest, startLine);
  return {
    target: { kind: "id", id: entity.id },
    fields: [{ kind: "createEntity", entity }],
    source: source.trim(),
    line: startLine,
  };
}

function parseDestroyLine(rest: string, source: string, startLine: number): ChangeAST {
  const id = rest.split(/\s+/)[0]?.replace(/\.$/, "") ?? "";
  if (!id) {
    throw new ParseError(makeIssue("E000", "error", { detail: "DESTROY requer um id" }, { file: "rules", line: startLine, column: 1 }));
  }
  const target: ChangeTarget = id === "$" ? { kind: "trigger" } : { kind: "id", id };
  return {
    target,
    fields: [{ kind: "destroyEntity" }],
    source: source.trim(),
    line: startLine,
  };
}

export function parseDoLine(source: string, options: { file?: string; startLine?: number } = {}): DoLine {
  const startLine = options.startLine ?? 1;
  const parsed = parseVerbRest(source);
  if (parsed && WORLD_VERBS.has(parsed.verb)) {
    if (parsed.verb === "CREATE") return { change: parseCreateLine(parsed.rest, source, startLine) };
    return { change: parseDestroyLine(parsed.rest, source, startLine) };
  }
  if (parsed && EFFECT_VERBS.has(parsed.verb)) {
    const args = parsed.rest
      .split(".")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!args.length && !EFFECT_ALLOW_EMPTY.has(parsed.verb)) {
      throw new ParseError(
        makeIssue("E000", "error", { detail: `${parsed.verb} requer argumentos` }, { file: options.file ?? "rules", line: startLine, column: 1 }),
      );
    }
    return { effect: { verb: parsed.verb.toLowerCase(), args, source: source.trim(), line: startLine } };
  }
  return { change: parseChangeLine(source, options) };
}

function parseSemanticKinds(raw: string): SemanticKind[] {
  const out: SemanticKind[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    if (SEMANTIC_SET.has(key)) out.push(key as SemanticKind);
  }
  return out;
}

function slugRuleId(raw: string): string {
  return raw.trim().replace(/\s+/g, "_") || "";
}

function stripNarrativeQuotes(text: string): string {
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) || (t.startsWith("'") && t.endsWith("'") && t.length >= 2)) {
    return t.slice(1, -1);
  }
  return t;
}

function parseNarrativeAssignment(rest: string): { voice: string | null; text: string } {
  const trimmed = rest.trim();
  if (!trimmed) return { voice: null, text: "" };
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return { voice: null, text: stripNarrativeQuotes(trimmed) };
  }
  const m = trimmed.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*:\s*(.*)$/u);
  if (m) return { voice: m[1]!.toLowerCase(), text: stripNarrativeQuotes(m[2] ?? "") };
  return { voice: null, text: stripNarrativeQuotes(trimmed) };
}

function parseFuncaoName(raw: string): string {
  return raw.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function parseRuleBlock(text: string, options: { file?: string; startLine?: number; id?: string } = {}): Omit<Rule, "index" | "source"> & { id: string } {
  const file = options.file ?? "rules";
  const startLine = options.startLine ?? 1;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let id: string | null = options.id ?? null;
  let trigger: MatcherAST | null = null;
  const conditions: MatcherAST[] = [];
  const changes: ChangeAST[] = [];
  const effects: EffectOp[] = [];
  let semantics: SemanticKind[] = [];
  let funcao = "";
  let narrative = "";
  const voices: Record<string, string> = {};
  let voiceKey: string | null = null;
  let section: "idle" | "on" | "if" | "do" | "narrative" | "semantic" | "function" = "idle";

  for (let i = 0; i < lines.length; i++) {
    const lineNo = startLine + i;
    const { code } = stripLineComment(lines[i] ?? "");
    const trimmed = code.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      const rest = trimmed.slice(1).trim();
      if (rest && !id) id = slugRuleId(rest);
      continue;
    }
    const kw = trimmed.match(KW_RE);
    if (kw) {
      const keyword = kw[1]!.toUpperCase();
      const rest = trimmed.slice(trimmed.indexOf(":") + 1);
      if (keyword === "ON") {
        section = "on";
        trigger = parseMatcher(rest, { file, startLine: lineNo });
      } else if (keyword === "IF") {
        section = "if";
        conditions.push(parseMatcher(rest, { file, startLine: lineNo }));
      } else if (keyword === "DO") {
        section = "do";
        if (rest.trim()) {
          const parsed = parseDoLine(rest, { file, startLine: lineNo });
          if (parsed.change) changes.push(parsed.change);
          if (parsed.effect) effects.push(parsed.effect);
        }
      } else if (keyword === "SEMANTIC" || keyword === "SEMANTICS") {
        section = "semantic";
        semantics = parseSemanticKinds(rest);
      } else if (keyword === "FUNCAO" || keyword === "FUNÇÃO" || keyword === "FUNCTION") {
        section = "function";
        funcao = parseFuncaoName(rest);
      } else {
        section = "narrative";
        const assigned = parseNarrativeAssignment(rest);
        voiceKey = assigned.voice;
        if (assigned.voice) voices[assigned.voice] = assigned.text;
        else narrative = assigned.text;
      }
      continue;
    }
    if (section === "do") {
      const parsed = parseDoLine(trimmed, { file, startLine: lineNo });
      if (parsed.change) changes.push(parsed.change);
      if (parsed.effect) effects.push(parsed.effect);
    } else if (section === "narrative") {
      const extra = stripNarrativeQuotes(trimmed);
      if (voiceKey) voices[voiceKey] = voices[voiceKey] ? `${voices[voiceKey]}\n${extra}` : extra;
      else narrative += (narrative ? "\n" : "") + extra;
    } else if (section === "semantic") semantics = [...semantics, ...parseSemanticKinds(trimmed)];
    else if (section === "function") {
      if (!funcao) funcao = parseFuncaoName(trimmed);
    } else fail(`linha inesperada: ${trimmed}`, { kind: "IDENT", value: trimmed, line: lineNo, column: 1, index: 0 });
  }
  if (!trigger) throw new ParseError(makeIssue("E002", "error", { id: id ?? "?" }, { file, line: startLine, column: 1 }));
  return { id: id ?? `regra_${startLine}`, trigger, conditions, changes, effects, semantics, funcao, narrative, voices, startLine };
}

type RuleFileBlock = { startLine: number; lines: string[]; id: string | null };

function splitRuleFile(text: string): RuleFileBlock[] {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const blocks: RuleFileBlock[] = [];
  let current: RuleFileBlock | null = null;
  const flush = () => {
    if (current && current.lines.some((l) => l.trim().length > 0)) blocks.push(current);
    current = null;
  };
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] ?? "";
    const { code } = stripLineComment(line);
    const trimmed = code.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const isHeader = trimmed.startsWith("#");
    if (isHeader && current) flush();
    if (!current) current = { startLine: i + 1, lines: [line], id: isHeader ? slugRuleId(trimmed.slice(1)) || null : null };
    else current.lines.push(line);
  }
  flush();
  return blocks;
}

export function compileRuleFile(
  source: string,
  world?: WorldModel,
  taxonomy?: CompiledTaxonomy | null,
): { rules: Rule[]; errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const rules: Rule[] = [];
  const blocks = splitRuleFile(source);
  let index = 0;
  for (const block of blocks) {
    const text = block.lines.join("\n");
    if (!/^(ON|IF|DO|NARRATIVA|NARRATIVE|SEMANTIC|SEMANTICS|FUNCAO|FUNÇÃO|FUNCTION)\s*:/im.test(text) && !/#\s*\S+/.test(text)) continue;
    if (/^PADRAO\b/im.test(text) && !/^ON\s*:/im.test(text)) continue;
    try {
      const parsed = parseRuleBlock(text, { startLine: block.startLine, id: block.id ?? undefined });
      rules.push({ ...parsed, index, source: text, startLine: block.startLine });
      index += 1;
    } catch (err) {
      if (err instanceof ParseError) errors.push(...err.issues);
      else errors.push(makeIssue("E000", "error", { detail: err instanceof Error ? err.message : String(err) }, { file: "rules", line: block.startLine, column: 1 }));
    }
  }
  if (world) {
    for (const rule of rules) {
      const any = [...world.keys()].some((id) => matchesEntity(rule.trigger, id, world, id, taxonomy));
      if (!any) warnings.push(makeIssue("W001", "warning", { id: rule.id }, { file: "rules", line: rule.startLine, column: 1 }));
    }
  }
  return { rules, errors, warnings };
}

function resolveSpawn(entity: Entity, triggerId: string): Entity {
  const next = cloneEntity(entity);
  for (const [key, value] of Object.entries(next.links)) {
    if (value === "$" || value === "trigger") next.links[key] = triggerId;
  }
  return next;
}

function resolveChangeTarget(world: WorldModel, target: ChangeTarget, triggerId: string): string | null {
  if (target.kind === "trigger") return triggerId;
  if (target.kind === "id") return target.id;
  const from = target.entityId === "$" ? triggerId : target.entityId;
  return world.get(from)?.links[target.key] ?? null;
}

export function applyChanges(world: WorldModel, changes: readonly ChangeAST[], triggerId: string): WorldModel {
  const next = cloneWorldModel(world);
  for (const change of changes) {
    const id = resolveChangeTarget(next, change.target, triggerId);
    if (!id) continue;
    const destroy = change.fields.some((field) => field.kind === "destroyEntity");
    if (destroy) {
      next.delete(id);
      continue;
    }
    const spawn = change.fields.find((field) => field.kind === "createEntity");
    if (spawn && spawn.kind === "createEntity" && !next.has(id)) {
      next.set(id, resolveSpawn(spawn.entity, triggerId));
    }
    const entity = next.get(id);
    if (!entity) continue;
    for (const field of change.fields) {
      if (field.kind === "createEntity" || field.kind === "destroyEntity") continue;
      if (field.kind === "addTag") entity.tags.add(field.tag);
      else if (field.kind === "removeTag") entity.tags.delete(field.tag);
      else if (field.kind === "setStat") entity.stats[field.key] = field.value;
      else if (field.kind === "deltaStat") entity.stats[field.key] = (entity.stats[field.key] ?? 0) + field.delta;
      else if (field.kind === "deltaStatFrom") {
        const fromId = resolveChangeTarget(next, field.from, triggerId);
        const amount = fromId ? (next.get(fromId)?.stats[field.stat] ?? 0) : 0;
        entity.stats[field.key] = (entity.stats[field.key] ?? 0) + field.sign * amount;
      }
      else if (field.kind === "mulStat") entity.stats[field.key] = (entity.stats[field.key] ?? 0) * field.factor;
      else if (field.kind === "setLink") {
        const dest = resolveChangeTarget(next, field.value, triggerId);
        if (dest) entity.links[field.key] = dest;
      }
    }
  }
  return next;
}

export function ruleSpecificity(rule: Rule, taxonomy?: CompiledTaxonomy | null): number {
  return specificityOf(rule.trigger, taxonomy) + rule.conditions.reduce((s, c) => s + specificityOf(c, taxonomy), 0);
}

export function findMatchingRule(
  triggerId: string,
  rules: readonly Rule[],
  world: WorldModel,
  taxonomy?: CompiledTaxonomy | null,
): Rule | null {
  let best: Rule | null = null;
  let bestScore = -1;
  let bestIndex = Infinity;
  for (const rule of rules) {
    if (!matchesEntity(rule.trigger, triggerId, world, triggerId, taxonomy)) continue;
    if (!rule.conditions.every((c) => queryHasResults(c, world, triggerId, taxonomy))) continue;
    const score = ruleSpecificity(rule, taxonomy);
    if (score > bestScore || (score === bestScore && rule.index < bestIndex)) {
      best = rule;
      bestScore = score;
      bestIndex = rule.index;
    }
  }
  return best;
}

export function findMatchingRules(
  triggerId: string,
  rules: readonly Rule[],
  world: WorldModel,
  taxonomy?: CompiledTaxonomy | null,
): RuleMatch[] {
  const out: RuleMatch[] = [];
  for (const rule of rules) {
    if (!matchesEntity(rule.trigger, triggerId, world, triggerId, taxonomy)) continue;
    if (!rule.conditions.every((c) => queryHasResults(c, world, triggerId, taxonomy))) continue;
    out.push({ rule, score: ruleSpecificity(rule, taxonomy) });
  }
  return out.sort((a, b) => b.score - a.score || a.rule.index - b.rule.index);
}
