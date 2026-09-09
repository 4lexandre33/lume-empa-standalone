import { stripLineComment } from "./lexer.ts";
import { DEFAULT_PROP_KEYWORD_NAMES } from "./narrative.ts";
import { lineColumnFromOffset, offsetOfLine } from "./source-ops.ts";
import type { SourceKind } from "./highlight.ts";
import type { WorldModel } from "./types.ts";
import { BUILTIN_TAGS, CATEGORY_LABEL, isCategoryTag } from "./types.ts";
import { compileTaxonomy, type CompiledTaxonomy } from "./taxonomy.ts";
import { compileEntityFile } from "./world-model.ts";

export type CompletionKind = "id" | "tag" | "stat" | "link" | "keyword" | "prop" | "snippet" | "star" | "bang";
export type CompletionItem = { label: string; insert: string; kind: CompletionKind; detail: string; documentation?: string };
export type CompletionContext = { slot: string; prefix: string; replaceStart: number; replaceEnd: number; line: number; column: number };
export type Vocabulary = { entityIds: string[]; tags: string[]; statKeys: string[]; linkKeys: string[]; propKeywords: string[] };

export const COMPLETION_TRIGGER_CHARS = [".", "=", "!", ":", " ", ">"] as const;
export const BUILTIN_LINKS = ["current_location"] as const;

const RULE_KEYWORDS: CompletionItem[] = [
  { label: "ON:", insert: "ON: ", kind: "keyword", detail: "gatilho" },
  { label: "IF:", insert: "IF: ", kind: "keyword", detail: "condição" },
  { label: "DO:", insert: "DO: ", kind: "keyword", detail: "mudanças" },
  { label: "narrativa:", insert: "narrativa: ", kind: "keyword", detail: "texto" },
];

const START_SNIPPET: CompletionItem = { label: "start()", insert: "start()", kind: "snippet", detail: "início da história" };

const ENTITY_SECTION: CompletionItem[] = [
  { label: "tags:", insert: "tags: ", kind: "keyword", detail: "etiquetas" },
  { label: "stats:", insert: "stats: ", kind: "keyword", detail: "números" },
  { label: "links:", insert: "links: ", kind: "keyword", detail: "ligações" },
  { label: "name:", insert: "name: ", kind: "prop", detail: "nome visível" },
  { label: "description:", insert: "description: ", kind: "prop", detail: "texto padrão" },
];

const TAXONOMY_ARROW: CompletionItem = { label: "→", insert: "→ ", kind: "keyword", detail: "herda de" };

export function collectVocabulary(options: {
  worldModel?: WorldModel;
  extras?: Record<string, Record<string, string>>;
  taxonomy?: CompiledTaxonomy | null;
  taxonomySource?: string;
}): Vocabulary {
  const entityIds = new Set<string>();
  const tags = new Set<string>(BUILTIN_TAGS);
  const statKeys = new Set<string>();
  const linkKeys = new Set<string>(BUILTIN_LINKS);
  const propKeywords = new Set<string>([...DEFAULT_PROP_KEYWORD_NAMES]);
  const world = options.worldModel ?? compileEntityFile("").worldModel;
  for (const entity of world.values()) {
    entityIds.add(entity.id);
    for (const tag of entity.tags) tags.add(tag);
    for (const key of Object.keys(entity.stats)) statKeys.add(key);
    for (const key of Object.keys(entity.links)) linkKeys.add(key);
    if (entity.extra) for (const key of Object.keys(entity.extra)) propKeywords.add(key);
  }
  if (options.extras) for (const extra of Object.values(options.extras)) for (const key of Object.keys(extra)) propKeywords.add(key);
  const tax = options.taxonomy ?? (options.taxonomySource != null ? compileTaxonomy(options.taxonomySource) : null);
  if (tax) {
    for (const [child, parent] of tax.parents) {
      tags.add(child);
      tags.add(parent);
    }
  }
  return {
    entityIds: [...entityIds].sort(),
    tags: [...tags].sort(),
    statKeys: [...statKeys].sort(),
    linkKeys: [...linkKeys].sort(),
    propKeywords: [...propKeywords].sort(),
  };
}

function lastIdentPrefix(fragment: string): { prefix: string; startInFragment: number } {
  const m = fragment.match(/([\p{L}_][\p{L}\p{N}\p{M}_]*)$/u);
  if (m) return { prefix: m[1]!, startInFragment: fragment.length - m[1]!.length };
  if (fragment.endsWith("$")) return { prefix: "$", startInFragment: fragment.length - 1 };
  return { prefix: "", startInFragment: fragment.length };
}

export function analyzeCompletion(source: string, kind: SourceKind, offset: number): CompletionContext {
  const clamped = Math.max(0, Math.min(offset, source.length));
  const { line, column } = lineColumnFromOffset(source, clamped);
  const lineStart = offsetOfLine(source, line);
  const lines = source.split(/\n/);
  const lineText = lines[line - 1] ?? "";
  const col0 = clamped - lineStart;
  const { code } = stripLineComment(lineText);
  if (col0 > code.length) return { slot: "none", prefix: "", replaceStart: clamped, replaceEnd: clamped, line, column };
  const before = lineText.slice(0, col0);
  const { prefix, startInFragment } = lastIdentPrefix(before);

  if (kind === "taxonomy") {
    const hash = before.indexOf("#");
    const slash = before.indexOf("//");
    if ((hash >= 0 && !before.slice(0, hash).includes('"')) || slash >= 0) {
      return { slot: "none", prefix: "", replaceStart: clamped, replaceEnd: clamped, line, column };
    }
    if (/(?:→|->)\s*[\p{L}_][\p{L}\p{N}\p{M}_]*$/u.test(before) || /(?:→|->)\s*$/u.test(before)) {
      return { slot: "taxonomy-parent", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
    if (/^\s*[\p{L}_][\p{L}\p{N}\p{M}_]*\s+$/u.test(before)) {
      return { slot: "taxonomy-arrow", prefix: "", replaceStart: clamped, replaceEnd: clamped, line, column };
    }
    return { slot: "taxonomy-child", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
  }

  if (kind === "entities") {
    if (/^\s*(tags)\s*:/i.test(before) || /tags\s*:/i.test(before)) {
      return { slot: "entity-tag", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
    if (/^\s*(stats)\s*:/i.test(before)) {
      return { slot: "entity-stat", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
    if (/^\s*(links)\s*:/i.test(before) || /=\s*[\p{L}_]*$/u.test(before)) {
      return { slot: "link-value", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
    if (/^\s*$/.test(before) || /^{\s*$/.test(before.trim()) || /;\s*$/.test(before)) {
      return { slot: "entity-section", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
  }

  if (kind === "rules") {
    const trimmed = before.trim();
    if (/^(ON|IF|DO|NARRATIVA|NARRATIVE)?$/i.test(trimmed)) {
      return { slot: "rule-keyword", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
    }
    if (before.endsWith("!") || /!$/.test(before)) {
      return { slot: "bang-tag", prefix: "", replaceStart: clamped, replaceEnd: clamped, line, column };
    }
    if (before.endsWith(".") || /\.[\p{L}_][\p{L}\p{N}\p{M}_]*$/u.test(before)) {
      return { slot: "field", prefix: before.endsWith(".") ? "" : prefix, replaceStart: clamped - (before.endsWith(".") ? 0 : prefix.length), replaceEnd: clamped, line, column };
    }
    return { slot: "selector", prefix, replaceStart: lineStart + startInFragment, replaceEnd: clamped, line, column };
  }
  return { slot: "none", prefix: "", replaceStart: clamped, replaceEnd: clamped, line, column };
}

function tags(vocab: Vocabulary): CompletionItem[] {
  return vocab.tags.map((tag) => ({
    label: tag,
    insert: tag,
    kind: "tag" as const,
    detail: isCategoryTag(tag) ? "categoria" : "tag",
    documentation: isCategoryTag(tag) ? CATEGORY_LABEL[tag] : undefined,
  }));
}
function ids(vocab: Vocabulary): CompletionItem[] {
  return vocab.entityIds.map((id) => ({ label: id, insert: id, kind: "id" as const, detail: "entidade" }));
}

export function completeAt(source: string, kind: SourceKind, offset: number, vocab: Vocabulary): { ctx: CompletionContext; items: CompletionItem[] } {
  const ctx = analyzeCompletion(source, kind, offset);
  let items: CompletionItem[] = [];
  switch (ctx.slot) {
    case "rule-keyword":
      items = RULE_KEYWORDS;
      break;
    case "entity-section": {
      const lineText = source.split("\n")[ctx.line - 1] ?? "";
      const top = /^\s*$/.test(lineText) || /^\s*start/i.test(lineText);
      items = top ? [START_SNIPPET, ...ENTITY_SECTION] : ENTITY_SECTION;
      break;
    }
    case "entity-tag":
    case "bang-tag":
      items = tags(vocab);
      break;
    case "entity-stat":
      items = vocab.statKeys.map((k) => ({ label: k, insert: k, kind: "stat" as const, detail: "stat" }));
      break;
    case "link-value":
      items = [...ids(vocab), { label: "$", insert: "$", kind: "bang", detail: "gatilho" }];
      break;
    case "field":
      items = [
        ...tags(vocab),
        ...vocab.statKeys.map((k) => ({ label: k, insert: k, kind: "stat" as const, detail: "stat" })),
        ...vocab.linkKeys.map((k) => ({ label: k, insert: k, kind: "link" as const, detail: "link" })),
      ];
      break;
    case "selector":
      items = [...ids(vocab), { label: "*", insert: "*", kind: "star", detail: "qualquer" }, { label: "$", insert: "$", kind: "bang", detail: "gatilho" }];
      break;
    case "taxonomy-child": {
      const lineText = source.split("\n")[ctx.line - 1] ?? "";
      const needsArrow = !/→|->/.test(lineText);
      items = tags(vocab).map((item) => ({ ...item, insert: needsArrow ? `${item.insert} → ` : item.insert }));
      break;
    }
    case "taxonomy-arrow":
      items = [TAXONOMY_ARROW];
      break;
    case "taxonomy-parent":
      items = tags(vocab);
      break;
    default:
      items = [];
  }
  const p = ctx.prefix.toLowerCase();
  const filtered = p ? items.filter((i) => i.label.toLowerCase().startsWith(p) || i.label.toLowerCase().includes(p)) : items;
  return { ctx, items: filtered };
}
