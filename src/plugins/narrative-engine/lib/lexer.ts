import type { Issue, IssueLocation, Token, TokenKind } from "./types.ts";

export const ERROR_CATALOG = {
  E000: "Sintaxe inválida: {detail}",
  E001: 'Entidade "{id}" referenciada em link não existe',
  E002: 'Regra "{id}" sem bloco ON:',
  E004: 'Chave "{key}" usada como stat e como link na mesma entidade',
  E007: 'Entidade "{id}" definida mais de uma vez',
  E010: 'Tag "{tag}" tem dois pais na taxonomia',
  E011: 'Tag "{tag}" não pode ser pai de si mesma',
  E012: "Ciclo na taxonomia: {chain}",
  E013: "Linha de taxonomia inválida: {detail}",
  W001: 'Regra "{id}" nunca pode disparar no estado inicial',
  W003: 'Entidade "{id}" não é referenciada (possivelmente órfã)',
  W010: 'Topic "{id}" sem regra ask',
  W011: 'links.conv de "{id}" aponta para "{target}" inexistente',
  W012: 'Canal "{id}" sem 2 estados',
  W013: 'Agente vivo "{id}" sem regra de reacção',
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export function makeIssue(
  code: ErrorCode,
  severity: Issue["severity"],
  vars: Record<string, string | number>,
  location: IssueLocation,
): Issue {
  return { code, severity, message: interpolate(ERROR_CATALOG[code], vars), location };
}

export class ParseError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[] | Issue, message?: string) {
    const list = Array.isArray(issues) ? issues : [issues];
    super(message ?? list.map((i) => `${i.code}: ${i.message}`).join("\n"));
    this.name = "ParseError";
    this.issues = list;
  }
}

const IDENT_START = /^[\p{L}_]$/u;
const IDENT_CONT = /^[\p{L}\p{N}\p{M}_]$/u;
const DIGIT = /[0-9]/;
const WS = /[ \t\r\n]/;

export function stripLineComment(line: string): { code: string; comment: string } {
  let inQuote: string | null = null;
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === "/" && line[i + 1] === "/") return { code: line.slice(0, i), comment: line.slice(i + 2) };
  }
  return { code: line, comment: "" };
}

export function tokenize(source: string, options: { startLine?: number; startColumn?: number; file?: string } = {}): Token[] {
  const file = options.file ?? "source";
  let i = 0;
  let line = options.startLine ?? 1;
  let column = options.startColumn ?? 1;
  const tokens: Token[] = [];
  const push = (kind: TokenKind, value: string, startIndex: number, startLine: number, startCol: number, number?: number) => {
    tokens.push({ kind, value, number, line: startLine, column: startCol, index: startIndex });
  };

  while (i < source.length) {
    const ch = source[i]!;
    if (WS.test(ch)) {
      if (ch === "\n") {
        line += 1;
        column = 1;
      } else column += 1;
      i += 1;
      continue;
    }
    const startIndex = i;
    const startLine = line;
    const startCol = column;
    const one = (kind: TokenKind, value: string) => {
      push(kind, value, startIndex, startLine, startCol);
      i += value.length;
      column += value.length;
    };

    if (ch === "." ) { one("DOT", "."); continue; }
    if (ch === "=" && source[i + 1] === "=") { one("EQ", "=="); continue; }
    if (ch === "=") { one("EQ", "="); continue; }
    if (ch === ":") { one("COLON", ":"); continue; }
    if (ch === "!") { one("BANG", "!"); continue; }
    if (ch === "*") { one("STAR", "*"); continue; }
    if (ch === "$") { one("DOLLAR", "$"); continue; }
    if (ch === "(") { one("LPAREN", "("); continue; }
    if (ch === ")") { one("RPAREN", ")"); continue; }
    if (ch === "{") { one("LBRACE", "{"); continue; }
    if (ch === "}") { one("RBRACE", "}"); continue; }
    if (ch === ",") { one("COMMA", ","); continue; }
    if (ch === ";") { one("SEMI", ";"); continue; }
    if (ch === "+") { one("PLUS", "+"); continue; }
    if (ch === ">") {
      if (source[i + 1] === "=") one("GTE", ">=");
      else one("GT", ">");
      continue;
    }
    if (ch === "<") {
      if (source[i + 1] === "=") one("LTE", "<=");
      else one("LT", "<");
      continue;
    }
    if (ch === "-" && DIGIT.test(source[i + 1] ?? "")) {
      let j = i + 1;
      while (DIGIT.test(source[j] ?? "")) j += 1;
      if (source[j] === "." && DIGIT.test(source[j + 1] ?? "")) {
        j += 1;
        while (DIGIT.test(source[j] ?? "")) j += 1;
      }
      const raw = source.slice(i, j);
      push("NUMBER", raw, startIndex, startLine, startCol, Number(raw));
      column += raw.length;
      i = j;
      continue;
    }
    if (ch === "-") { one("MINUS", "-"); continue; }
    if (DIGIT.test(ch)) {
      let j = i;
      while (DIGIT.test(source[j] ?? "")) j += 1;
      if (source[j] === "." && DIGIT.test(source[j + 1] ?? "")) {
        j += 1;
        while (DIGIT.test(source[j] ?? "")) j += 1;
      }
      const raw = source.slice(i, j);
      push("NUMBER", raw, startIndex, startLine, startCol, Number(raw));
      column += raw.length;
      i = j;
      continue;
    }
    if (IDENT_START.test(ch)) {
      let j = i + 1;
      while (IDENT_CONT.test(source[j] ?? "")) j += 1;
      const raw = source.slice(i, j);
      push("IDENT", raw, startIndex, startLine, startCol);
      column += raw.length;
      i = j;
      continue;
    }
    throw new ParseError(makeIssue("E000", "error", { detail: `caractere inesperado '${ch}'` }, { file, line: startLine, column: startCol }));
  }
  push("EOF", "", i, line, column);
  return tokens;
}

export class TokenCursor {
  private i = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  peek(): Token {
    return this.tokens[this.i] ?? this.tokens[this.tokens.length - 1]!;
  }
  at(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }
  consume(): Token {
    const t = this.peek();
    if (t.kind !== "EOF") this.i += 1;
    return t;
  }
  expect(kind: TokenKind, file: string, detail: string): Token {
    const t = this.peek();
    if (t.kind !== kind) {
      throw new ParseError(makeIssue("E000", "error", { detail }, { file, line: t.line, column: t.column }));
    }
    return this.consume();
  }
}
