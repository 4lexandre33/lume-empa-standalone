import type { NotebookCompile } from "./notebook.ts";

export type FreshCompiler = (text: string) => NotebookCompile;

type Block = {
  key: string;
  title: string;
  start: number;
  end: number;
};

const hashes = new Map<string, string>();
let lastTextHash = "";
let lastResult: NotebookCompile | null = null;

export function resetNotebookCache(): void {
  hashes.clear();
  lastTextHash = "";
  lastResult = null;
}

export function hashString(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function splitBlocks(text: string): Block[] {
  const lines = text.split(/\n/);
  const heads: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^###\s+/.test(lines[i]!.trim())) heads.push(i);
  }
  if (!heads.length) {
    return [{ key: "_preamble", title: "_preamble", start: 0, end: lines.length }];
  }
  const blocks: Block[] = [];
  if (heads[0]! > 0) {
    const pre = lines.slice(0, heads[0]!).join("\n").trim();
    if (pre) blocks.push({ key: "_preamble", title: "_preamble", start: 0, end: heads[0]! });
  }
  for (let h = 0; h < heads.length; h++) {
    const start = heads[h]!;
    const end = h + 1 < heads.length ? heads[h + 1]! : lines.length;
    const title = lines[start]!.trim().replace(/^###\s+/, "").trim();
    blocks.push({ key: `h${h}:${title}`, title, start, end });
  }
  return blocks;
}

export function compileNotebookCached(text: string, fresh: FreshCompiler): NotebookCompile {
  const textHash = hashString(text);
  if (textHash === lastTextHash && lastResult) {
    return { ...lastResult, dirty: [] };
  }
  const lines = text.split(/\n/);
  const blocks = splitBlocks(text);
  const dirty: string[] = [];
  const live = new Set<string>();
  for (const block of blocks) {
    live.add(block.key);
    const hash = hashString(lines.slice(block.start, block.end).join("\n"));
    if (hashes.get(block.key) !== hash) dirty.push(block.title);
    hashes.set(block.key, hash);
  }
  for (const key of [...hashes.keys()]) if (!live.has(key)) hashes.delete(key);
  const compiled = fresh(text);
  const result = { ...compiled, dirty };
  lastTextHash = textHash;
  lastResult = result;
  return result;
}
