import { stripLineComment, tokenize } from "./lexer.ts";
import type { Token } from "./types.ts";

export type SynClass =
  | "syn-id"
  | "syn-tag"
  | "syn-stat"
  | "syn-link"
  | "syn-num"
  | "syn-op"
  | "syn-comment"
  | "syn-plain"
  | "syn-kw"
  | "syn-brace";
export type HighlightSpan = { text: string; cls: SynClass };
export type SourceKind = "entities" | "rules" | "taxonomy";

const RULE_KW_RE = /^(ON|IF|DO|NARRATIVE|NARRATIVA)\s*:/i;
const SECTION_RE = /^(tags|stats|links|name|description)\s*:/i;
const TAXONOMY_TOKEN_RE = /[\p{L}_][\p{L}\p{N}\p{M}_]*|→|->/gu;

function tokenClass(tokens: Token[], index: number, isFirstId: boolean): SynClass {
  const t = tokens[index]!;
  switch (t.kind) {
    case "IDENT": {
      if (isFirstId && index === 0) return "syn-id";
      const next = tokens[index + 1];
      if (next && (next.kind === "EQ" || next.kind === "GT" || next.kind === "LT" || next.kind === "GTE" || next.kind === "LTE" || next.kind === "PLUS" || next.kind === "MINUS" || next.kind === "STAR")) {
        const after = tokens[index + 2];
        return after?.kind === "NUMBER" ? "syn-stat" : "syn-link";
      }
      return "syn-tag";
    }
    case "NUMBER":
      return "syn-num";
    case "STAR":
    case "BANG":
    case "DOLLAR":
      return "syn-kw";
    case "DOT":
    case "EQ":
    case "GT":
    case "LT":
    case "GTE":
    case "LTE":
    case "PLUS":
    case "MINUS":
    case "COLON":
    case "COMMA":
    case "SEMI":
    case "LBRACE":
    case "RBRACE":
      return "syn-op";
    default:
      return "syn-plain";
  }
}

function spansFromLine(line: string, kind: SourceKind): HighlightSpan[] {
  const { code } = stripLineComment(line);
  const spans: HighlightSpan[] = [];
  const kw = kind === "rules" ? code.match(RULE_KW_RE) : code.match(SECTION_RE);
  let rest = code;
  if (kw) {
    spans.push({ text: kw[0]!, cls: "syn-kw" });
    rest = code.slice(kw[0]!.length);
  }
  try {
    const tokens = tokenize(rest, { startColumn: 1 }).filter((t) => t.kind !== "EOF");
    let cursor = 0;
    tokens.forEach((t, i) => {
      const rel = Math.max(0, t.column - 1);
      if (rel > cursor) spans.push({ text: rest.slice(cursor, rel), cls: "syn-plain" });
      spans.push({ text: t.value, cls: tokenClass(tokens, i, !kw) });
      cursor = rel + t.value.length;
    });
    if (cursor < rest.length) spans.push({ text: rest.slice(cursor), cls: "syn-plain" });
  } catch {
    spans.push({ text: rest, cls: "syn-plain" });
  }
  if (line.includes("//")) {
    const idx = line.indexOf("//");
    if (idx >= 0) return [...spansFromLine(line.slice(0, idx), kind).filter((s) => s.text), { text: line.slice(idx), cls: "syn-comment" }];
  }
  if (spans.length === 0) spans.push({ text: line || " ", cls: "syn-plain" });
  return spans;
}

function highlightTaxonomyLine(line: string): HighlightSpan[] {
  if (/^\s*(#|\/\/)/.test(line)) return [{ text: line || " ", cls: "syn-comment" }];
  const { code, comment } = stripLineComment(line);
  const hash = code.indexOf("#");
  const body = hash >= 0 ? code.slice(0, hash) : code;
  const spans: HighlightSpan[] = [];
  TAXONOMY_TOKEN_RE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TAXONOMY_TOKEN_RE.exec(body))) {
    if (m.index > last) spans.push({ text: body.slice(last, m.index), cls: "syn-plain" });
    const tok = m[0]!;
    spans.push({ text: tok, cls: tok === "→" || tok === "->" ? "syn-op" : "syn-tag" });
    last = m.index + tok.length;
  }
  if (last < body.length) spans.push({ text: body.slice(last), cls: "syn-plain" });
  if (hash >= 0) spans.push({ text: code.slice(hash), cls: "syn-comment" });
  if (comment !== "" || line.includes("//")) {
    const idx = line.indexOf("//");
    if (idx >= 0) spans.push({ text: line.slice(idx), cls: "syn-comment" });
  }
  if (spans.length === 0) spans.push({ text: line || " ", cls: "syn-plain" });
  return spans;
}

export function highlightSource(source: string, kind: SourceKind): HighlightSpan[][] {
  return source.split("\n").map((line) => {
    if (kind === "taxonomy") {
      const spans = highlightTaxonomyLine(line);
      return spans.length ? spans : [{ text: " ", cls: "syn-plain" as const }];
    }
    if (kind === "entities" && /^\s*start\s*\(\s*\)\s*;?\s*$/i.test(line)) {
      return [{ text: line || " ", cls: "syn-kw" as const }];
    }
    if (line.trim().startsWith("#") && kind === "rules") return [{ text: line || " ", cls: "syn-comment" as const }];
    const brace = line.indexOf("{");
    if (kind === "rules" && brace >= 0) {
      const before = line.slice(0, brace);
      return [...spansFromLine(before, kind), { text: line.slice(brace), cls: "syn-brace" as const }];
    }
    const spans = spansFromLine(line, kind);
    return spans.length ? spans : [{ text: " ", cls: "syn-plain" as const }];
  });
}

export function identAtColumn(line: string, column: number): string | null {
  const { code } = stripLineComment(line);
  try {
    for (const t of tokenize(code, { startColumn: 1 })) {
      if ((t.kind === "IDENT" || t.kind === "DOLLAR") && column >= t.column && column <= t.column + t.value.length) return t.value;
    }
  } catch {
    return null;
  }
  return null;
}
