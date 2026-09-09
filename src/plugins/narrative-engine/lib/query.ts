import { makeIssue, ParseError, tokenize, TokenCursor } from "./lexer.ts";
import { depthOf, explainTagMatch, matchesTag, type CompiledTaxonomy, type TagMatchMode } from "./taxonomy.ts";
import type { Comparator, MatcherAST, MatcherClause, MatcherSelector, MatcherValue, Token, WorldModel } from "./types.ts";
import { getLink } from "./world-model.ts";

function fail(detail: string, t: Token, file = "rules"): never {
  throw new ParseError(makeIssue("E000", "error", { detail }, { file, line: t.line, column: t.column }));
}

function parseValue(cur: TokenCursor, file: string): MatcherValue {
  if (cur.at("LPAREN")) {
    cur.consume();
    const kw = cur.expect("IDENT", file, "esperado 'link'");
    if (kw.value.toLowerCase() !== "link") fail("esperado 'link'", kw, file);
    const idTok = cur.at("DOLLAR") ? cur.consume() : cur.expect("IDENT", file, "esperado id");
    cur.expect("DOT", file, "esperado . depois do id no lookup");
    const keyTok = cur.expect("IDENT", file, "esperado chave do link");
    cur.expect("RPAREN", file, "esperado )");
    return { kind: "linkLookup", entityId: idTok.value, key: keyTok.value };
  }
  if (cur.at("NUMBER")) {
    const t = cur.consume();
    return { kind: "number", value: t.number ?? Number(t.value) };
  }
  if (cur.at("DOLLAR")) {
    cur.consume();
    return { kind: "trigger" };
  }
  const t = cur.expect("IDENT", file, "esperado valor");
  return { kind: "id", id: t.value };
}

export function parseMatcher(source: string, options: { file?: string; startLine?: number } = {}): MatcherAST {
  const file = options.file ?? "rules";
  const tokens = tokenize(source.trim(), { file, startLine: options.startLine ?? 1 });
  const cur = new TokenCursor(tokens);
  let selector: MatcherSelector;
  if (cur.at("STAR")) {
    cur.consume();
    selector = { kind: "any" };
  } else if (cur.at("DOLLAR")) {
    cur.consume();
    selector = { kind: "trigger" };
  } else {
    const t = cur.expect("IDENT", file, "esperado seletor (*, $ ou id)");
    selector = { kind: "id", id: t.value };
  }
  const clauses: MatcherClause[] = [];
  while (cur.at("DOT")) {
    cur.consume();
    let negated = false;
    if (cur.at("BANG")) {
      cur.consume();
      negated = true;
    }
    const keyTok = cur.expect("IDENT", file, "esperado tag/stat/link");
    let op: Comparator | undefined;
    let value: MatcherValue | undefined;
    const p = cur.peek();
    if (p.kind === "EQ" || p.kind === "GT" || p.kind === "LT" || p.kind === "GTE" || p.kind === "LTE") {
      cur.consume();
      op = (p.kind === "EQ" ? "=" : p.value) as Comparator;
      value = parseValue(cur, file);
    }
    clauses.push({ negated, key: keyTok.value, op, value });
  }
  return { selector, clauses, source: source.trim() };
}

function resolveValue(value: MatcherValue | undefined, world: WorldModel, triggerId: string): string | number | null {
  if (!value) return null;
  if (value.kind === "number") return value.value;
  if (value.kind === "id") return value.id;
  if (value.kind === "trigger") return triggerId;
  const id = value.entityId === "$" ? triggerId : value.entityId;
  return getLink(world, id, value.key);
}

function cmp(left: number, op: Comparator, right: number): boolean {
  if (op === "=") return left === right;
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  if (op === ">=") return left >= right;
  if (op === "<=") return left <= right;
  return false;
}

export function matchesEntity(
  ast: MatcherAST,
  entityId: string,
  world: WorldModel,
  triggerId: string,
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): boolean {
  const entity = world.get(entityId);
  if (!entity) return false;
  if (ast.selector.kind === "id" && entity.id !== ast.selector.id) return false;
  if (ast.selector.kind === "trigger" && entity.id !== triggerId) return false;
  for (const c of ast.clauses) {
    let inner = true;
    if (!c.op) inner = matchesTag(entity, c.key, taxonomy, mode);
    else {
      const resolved = resolveValue(c.value, world, triggerId);
      if (Object.prototype.hasOwnProperty.call(entity.stats, c.key)) {
        inner = typeof resolved === "number" && cmp(entity.stats[c.key]!, c.op, resolved);
      } else if (Object.prototype.hasOwnProperty.call(entity.links, c.key)) {
        inner = c.op === "=" && resolved !== null && entity.links[c.key] === String(resolved);
      } else inner = false;
    }
    if (c.negated ? inner : !inner) return false;
  }
  return true;
}

export type ClauseExplain = {
  source: string;
  matched: boolean;
  kind: "selector" | "tag" | "stat" | "link";
  detail: string;
  path?: string[];
};

export type MatcherExplain = {
  matched: boolean;
  clauses: ClauseExplain[];
};

function clauseSource(c: MatcherClause): string {
  const bang = c.negated ? "!" : "";
  if (!c.op) return bang + c.key;
  return `${bang}${c.key}${c.op}${c.value?.kind === "number" ? c.value.value : c.value?.kind === "id" ? c.value.id : c.value?.kind === "trigger" ? "$" : ""}`;
}

export function explainMatcher(
  ast: MatcherAST,
  entityId: string,
  world: WorldModel,
  triggerId: string,
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): MatcherExplain {
  const entity = world.get(entityId);
  const clauses: ClauseExplain[] = [];
  if (!entity) {
    return { matched: false, clauses: [{ source: ast.source, matched: false, kind: "selector", detail: `${entityId} não existe` }] };
  }
  if (ast.selector.kind === "id") {
    clauses.push({
      source: ast.selector.id,
      matched: entity.id === ast.selector.id,
      kind: "selector",
      detail: entity.id === ast.selector.id ? `id ${entity.id}` : `${entity.id} não é ${ast.selector.id}`,
    });
  } else if (ast.selector.kind === "trigger") {
    clauses.push({
      source: "$",
      matched: entity.id === triggerId,
      kind: "selector",
      detail: entity.id === triggerId ? "é o gatilho" : "não é o gatilho",
    });
  } else {
    clauses.push({ source: "*", matched: true, kind: "selector", detail: "qualquer entidade" });
  }
  for (const c of ast.clauses) {
    if (!c.op) {
      const why = explainTagMatch(entity, c.key, taxonomy);
      const inner = mode === "direct" ? why.direct : why.matched;
      const matched = c.negated ? !inner : inner;
      clauses.push({
        source: clauseSource(c),
        matched,
        kind: "tag",
        detail: c.negated ? (inner ? `tem ${c.key}, negado` : `não tem ${c.key}`) : why.reason,
        path: why.path.length > 1 ? why.path : undefined,
      });
      continue;
    }
    const resolved = resolveValue(c.value, world, triggerId);
    let inner = false;
    let kind: ClauseExplain["kind"] = "stat";
    let detail = "";
    if (Object.prototype.hasOwnProperty.call(entity.stats, c.key)) {
      inner = typeof resolved === "number" && cmp(entity.stats[c.key]!, c.op, resolved);
      detail = `${c.key}=${entity.stats[c.key]} ${inner ? "casa" : "não casa"} ${c.op}${resolved}`;
    } else if (Object.prototype.hasOwnProperty.call(entity.links, c.key)) {
      kind = "link";
      inner = c.op === "=" && resolved !== null && entity.links[c.key] === String(resolved);
      detail = `${c.key}=${entity.links[c.key] ?? "—"} ${inner ? "casa" : "não casa"}`;
    } else {
      detail = `${c.key} não é stat nem link`;
    }
    clauses.push({ source: clauseSource(c), matched: c.negated ? !inner : inner, kind, detail });
  }
  return { matched: clauses.every((c) => c.matched), clauses };
}

export function query(
  matcher: string | MatcherAST,
  world: WorldModel,
  triggerId = "",
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): [string, ...unknown[]][] {
  const ast = typeof matcher === "string" ? parseMatcher(matcher) : matcher;
  const out: [string][] = [];
  for (const id of world.keys()) if (matchesEntity(ast, id, world, triggerId, taxonomy, mode)) out.push([id]);
  return out;
}

export function queryHasResults(
  matcher: string | MatcherAST,
  world: WorldModel,
  triggerId = "",
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): boolean {
  return query(matcher, world, triggerId, taxonomy, mode).length > 0;
}

export function matcherHasResults(
  ast: MatcherAST,
  world: WorldModel,
  triggerId = "",
  taxonomy?: CompiledTaxonomy | null,
  mode: TagMatchMode = "effective",
): boolean {
  return queryHasResults(ast, world, triggerId, taxonomy, mode);
}

export function specificityOf(ast: MatcherAST, taxonomy?: CompiledTaxonomy | null): number {
  let score = ast.selector.kind === "id" ? 8 : 0;
  for (const c of ast.clauses) {
    if (!c.op) score += 1 + depthOf(c.key, taxonomy);
    else score += 1;
  }
  return score;
}
