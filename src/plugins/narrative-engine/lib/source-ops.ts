import { compileRuleFile } from "./rule-engine.ts";
import { blankEntityBlock, compileEntityFile } from "./world-model.ts";

export type SourceRange = { startLine: number; endLine: number };

export function lineColumnFromOffset(source: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let col = 1;
  for (let i = 0; i < clamped; i++) {
    if (source[i] === "\n") {
      line += 1;
      col = 1;
    } else col += 1;
  }
  return { line, column: col };
}

export function offsetOfLine(source: string, line: number): number {
  if (line <= 1) return 0;
  let current = 1;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") {
      current += 1;
      if (current === line) return i + 1;
    }
  }
  return source.length;
}

export function isValidEntityId(id: string): boolean {
  return /^[\p{L}_][\p{L}\p{N}\p{M}_]*$/u.test(id);
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base) && isValidEntityId(base)) return base;
  let i = 2;
  while (set.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function locateEntityBlock(source: string, id: string): SourceRange | null {
  const lines = source.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith(".") || trimmed.startsWith("#")) continue;
    const head = trimmed.split(/[.\s{(]/)[0];
    if (head === id) {
      if (trimmed.includes("{") && !trimmed.includes("}")) {
        let end = i;
        while (end + 1 < lines.length && !lines[end]!.includes("}")) end += 1;
        return { startLine: i + 1, endLine: end + 1 };
      }
      let end = i;
      while (end + 1 < lines.length && lines[end + 1]!.trim().startsWith(".")) end += 1;
      return { startLine: i + 1, endLine: end + 1 };
    }
  }
  return null;
}

export function locateRuleBlock(source: string, id: string): SourceRange | null {
  const compiled = compileRuleFile(source);
  const rule = compiled.rules.find((r) => r.id === id);
  if (!rule) return null;
  return { startLine: rule.startLine, endLine: rule.startLine + rule.source.split("\n").length - 1 };
}

export function insertEntity(source: string, id = "NOVA"): { source: string; id: string; line: number } {
  const taken = compileEntityFile(source).worldModel.keys();
  const nextId = uniqueId(id, taken);
  const block = blankEntityBlock(nextId) + "\n";
  const next = source.endsWith("\n") || source === "" ? source + block : source + "\n" + block;
  const loc = locateEntityBlock(next, nextId);
  return { source: next, id: nextId, line: loc?.startLine ?? 1 };
}

export function insertRule(source: string, id = "nova_regra"): { source: string; id: string; line: number } {
  const taken = compileRuleFile(source).rules.map((r) => r.id);
  const nextId = uniqueId(id, taken);
  const block = `\n# ${nextId}\nON: ${nextId}\nnarrativa: "…"`;
  const next = source + (source.endsWith("\n") ? "" : "\n") + block;
  const loc = locateRuleBlock(next, nextId);
  return { source: next, id: nextId, line: loc?.startLine ?? 1 };
}

export function deleteEntityBlock(source: string, id: string): string | null {
  const loc = locateEntityBlock(source, id);
  if (!loc) return null;
  const lines = source.split("\n");
  lines.splice(loc.startLine - 1, loc.endLine - loc.startLine + 1);
  return lines.join("\n");
}

export function deleteRuleBlock(source: string, id: string): string | null {
  const loc = locateRuleBlock(source, id);
  if (!loc) return null;
  const lines = source.split("\n");
  lines.splice(loc.startLine - 1, loc.endLine - loc.startLine + 1);
  return lines.join("\n");
}

export function searchSources(entities: string, rules: string, query: string): { file: "entities" | "rules"; line: number; column: number; text: string }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: { file: "entities" | "rules"; line: number; column: number; text: string }[] = [];
  const scan = (source: string, file: "entities" | "rules") => {
    source.split("\n").forEach((line, i) => {
      const idx = line.toLowerCase().indexOf(needle);
      if (idx >= 0) hits.push({ file, line: i + 1, column: idx + 1, text: line.trim() });
    });
  };
  scan(entities, "entities");
  scan(rules, "rules");
  return hits;
}

/** True when caret is inside a tags/stats/links list of an entity block. */
export function inEntityFieldList(source: string, offset: number): boolean {
  const before = source.slice(0, offset);
  const lastOpen = before.lastIndexOf("{");
  const lastClose = before.lastIndexOf("}");
  if (lastOpen < 0 || lastOpen < lastClose) return false;
  const chunk = before.slice(lastOpen);
  const m = chunk.match(/(tags|stats|links)\s*:\s*([^;]*)$/i);
  return Boolean(m);
}

export function fieldListShouldComma(source: string, offset: number): boolean {
  if (!inEntityFieldList(source, offset)) return false;
  const prev = source[offset - 1] ?? "";
  return /[\p{L}\p{N}_]/u.test(prev);
}
