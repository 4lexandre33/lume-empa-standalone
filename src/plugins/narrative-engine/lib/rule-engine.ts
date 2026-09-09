import { makeIssue, ParseError, stripLineComment, tokenize, TokenCursor } from "./lexer.ts";
import { matchesEntity, parseMatcher, queryHasResults, specificityOf } from "./query.ts";
import type { CompiledTaxonomy } from "./taxonomy.ts";
import type { ChangeAST, ChangeField, ChangeTarget, Issue, MatcherAST, Token, WorldModel } from "./types.ts";
import { cloneWorldModel } from "./world-model.ts";

export type Rule = {
  id: string;
  index: number;
  trigger: MatcherAST;
  conditions: MatcherAST[];
  changes: ChangeAST[];
  narrative: string;
  source: string;
  startLine: number;
};

export type RuleMatch = { rule: Rule; score: number };

const KW_RE = /^(ON|IF|DO|NARRATIVA|NARRATIVE)\s*:/i;

function fail(detail: string, t: Token, file = "rules"): never {
  throw new ParseError(makeIssue("E000", "error", { detail }, { file, line: t.line, column: t.column }));
}

function parseTarget(cur: TokenCursor, file: string): ChangeTarget {
  if (cur.at("DOLLAR")) {
    cur.consume();
    return { kind: "trigger" };
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
      } else if (v.kind === "DOLLAR" || v.kind === "IDENT") {
        cur.consume();
        fields.push({ kind: "setLink", key: keyTok.value, value: v.kind === "DOLLAR" ? { kind: "trigger" } : { kind: "id", id: v.value } });
      } else fail("esperado número ou id", v, file);
    } else if (cur.at("PLUS") || cur.at("MINUS")) {
      const sign = cur.consume().kind === "MINUS" ? -1 : 1;
      const n = cur.expect("NUMBER", file, "esperado número");
      fields.push({ kind: "deltaStat", key: keyTok.value, delta: sign * (n.number ?? Number(n.value)) });
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

export function parseRuleBlock(text: string, options: { file?: string; startLine?: number; id?: string } = {}): Omit<Rule, "index" | "source"> & { id: string } {
  const file = options.file ?? "rules";
  const startLine = options.startLine ?? 1;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let id: string | null = options.id ?? null;
  let trigger: MatcherAST | null = null;
  const conditions: MatcherAST[] = [];
  const changes: ChangeAST[] = [];
  let narrative = "";
  let section: "idle" | "on" | "if" | "do" | "narrative" = "idle";

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
        if (rest.trim()) changes.push(parseChangeLine(rest, { file, startLine: lineNo }));
      } else {
        section = "narrative";
        narrative = stripNarrativeQuotes(rest.trim());
      }
      continue;
    }
    if (section === "do") changes.push(parseChangeLine(trimmed, { file, startLine: lineNo }));
    else if (section === "narrative") narrative += (narrative ? "\n" : "") + stripNarrativeQuotes(trimmed);
    else fail(`linha inesperada: ${trimmed}`, { kind: "IDENT", value: trimmed, line: lineNo, column: 1, index: 0 });
  }
  if (!trigger) throw new ParseError(makeIssue("E002", "error", { id: id ?? "?" }, { file, line: startLine, column: 1 }));
  return { id: id ?? `regra_${startLine}`, trigger, conditions, changes, narrative, startLine };
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
    if (!/^(ON|IF|DO|NARRATIVA|NARRATIVE)\s*:/im.test(text) && !/#\s*\S+/.test(text)) continue;
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

export function applyChanges(world: WorldModel, changes: readonly ChangeAST[], triggerId: string): WorldModel {
  const next = cloneWorldModel(world);
  for (const change of changes) {
    const id = change.target.kind === "trigger" ? triggerId : change.target.id;
    const entity = next.get(id);
    if (!entity) continue;
    for (const field of change.fields) {
      if (field.kind === "addTag") entity.tags.add(field.tag);
      else if (field.kind === "removeTag") entity.tags.delete(field.tag);
      else if (field.kind === "setStat") entity.stats[field.key] = field.value;
      else if (field.kind === "deltaStat") entity.stats[field.key] = (entity.stats[field.key] ?? 0) + field.delta;
      else if (field.kind === "mulStat") entity.stats[field.key] = (entity.stats[field.key] ?? 0) * field.factor;
      else if (field.kind === "setLink") entity.links[field.key] = field.value.kind === "trigger" ? triggerId : field.value.id;
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
