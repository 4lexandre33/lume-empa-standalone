import { makeIssue, ParseError, stripLineComment, tokenize, TokenCursor } from "./lexer.ts";
import { effectiveTags, type CompiledTaxonomy } from "./taxonomy.ts";
import { CATEGORY_TAGS, type Entity, type Issue, type WorldModel } from "./types.ts";

const FILE = "entities";

export type EntityDef = { source: string; startLine: number; endLine: number; kind: "dotted" | "block" | "start" };

export function isStartDecl(text: string): boolean {
  return /^start\s*\(\s*\)\s*;?$/i.test(text.trim());
}

export function makeStartEntity(): Entity {
  return { id: "start", tags: new Set(["hidden"]), stats: {}, links: {} };
}

export function cloneEntity(entity: Entity): Entity {
  return {
    id: entity.id,
    tags: new Set(entity.tags),
    stats: { ...entity.stats },
    links: { ...entity.links },
    extra: entity.extra ? { ...entity.extra } : undefined,
  };
}

export function cloneWorldModel(world: WorldModel): WorldModel {
  const next: WorldModel = new Map();
  for (const [id, entity] of world) next.set(id, cloneEntity(entity));
  return next;
}

export function getLink(world: WorldModel, id: string, key: string): string | null {
  return world.get(id)?.links[key] ?? null;
}
export function getStat(world: WorldModel, id: string, key: string): number | null {
  const v = world.get(id)?.stats[key];
  return typeof v === "number" ? v : null;
}
export function hasTag(world: WorldModel, id: string, tag: string): boolean {
  return world.get(id)?.tags.has(tag) ?? false;
}

function fail(detail: string, line: number, column = 1): never {
  throw new ParseError(makeIssue("E000", "error", { detail }, { file: FILE, line, column }));
}

function applyField(entity: Entity, key: string, raw: string | undefined, line: number, column: number) {
  if (raw === undefined) {
    entity.tags.add(key);
    return;
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    if (key in entity.links) {
      throw new ParseError(makeIssue("E004", "error", { key }, { file: FILE, line, column, endColumn: column + key.length }));
    }
    entity.stats[key] = Number(raw);
  } else {
    if (key in entity.stats) {
      throw new ParseError(makeIssue("E004", "error", { key }, { file: FILE, line, column, endColumn: column + key.length }));
    }
    entity.links[key] = raw;
  }
}

export function parseDottedEntity(line: string, startLine = 1): Entity {
  const { code } = stripLineComment(line);
  const trimmed = code.trim();
  if (!trimmed) fail("linha de entidade vazia", startLine);
  const tokens = tokenize(trimmed, { file: FILE, startLine });
  const cur = new TokenCursor(tokens);
  const idTok = cur.expect("IDENT", FILE, "esperado id de entidade");
  const entity: Entity = { id: idTok.value, tags: new Set(), stats: {}, links: {} };
  while (cur.at("DOT")) {
    cur.consume();
    const keyTok = cur.expect("IDENT", FILE, "esperado tag, stat ou link");
    if (cur.at("EQ")) {
      cur.consume();
      const valueTok = cur.peek();
      if (valueTok.kind === "NUMBER") {
        cur.consume();
        applyField(entity, keyTok.value, String(valueTok.number ?? valueTok.value), keyTok.line, keyTok.column);
      } else if (valueTok.kind === "IDENT" || valueTok.kind === "DOLLAR") {
        cur.consume();
        applyField(entity, keyTok.value, valueTok.value, keyTok.line, keyTok.column);
      } else fail("esperado número ou id depois de =", valueTok.line, valueTok.column);
    } else {
      entity.tags.add(keyTok.value);
    }
  }
  if (!cur.at("EOF")) {
    const t = cur.peek();
    fail(`token inesperado '${t.value}'`, t.line, t.column);
  }
  return entity;
}

function splitSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(tags|stats|links|name|description)\s*:/gi;
  const hits: { key: string; index: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    hits.push({ key: m[1]!.toLowerCase(), index: m.index, end: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]!;
    const until = hits[i + 1]?.index ?? body.length;
    let raw = body.slice(hit.end, until).trim();
    if (raw.endsWith(";")) raw = raw.slice(0, -1).trim();
    out[hit.key] = raw;
  }
  return out;
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseBlockEntity(id: string, body: string, startLine = 1): Entity {
  const entity: Entity = { id, tags: new Set(), stats: {}, links: {}, extra: {} };
  const sections = splitSections(body);
  for (const item of splitList(sections.tags ?? "")) {
    const tag = item.replace(/;$/, "").trim();
    if (tag) entity.tags.add(tag);
  }
  for (const item of splitList(sections.stats ?? "")) {
    const pair = item.replace(/;$/, "").trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq < 0) fail(`stat sem = : ${pair}`, startLine);
    const key = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim();
    if (!/^-?\d+(\.\d+)?$/.test(val)) fail(`stat '${key}' precisa de número`, startLine);
    entity.stats[key] = Number(val);
  }
  for (const item of splitList(sections.links ?? "")) {
    const pair = item.replace(/;$/, "").trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq < 0) fail(`link sem = : ${pair}`, startLine);
    entity.links[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  if (sections.name) entity.extra!.name = unquote(sections.name);
  if (sections.description) entity.extra!.description = unquote(sections.description);
  if (entity.extra && Object.keys(entity.extra).length === 0) delete entity.extra;
  return entity;
}

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

export function preprocessEntityFile(source: string): { defs: EntityDef[] } {
  const lines = source.replace(/^\uFEFF/, "").split(/\n/);
  const defs: EntityDef[] = [];
  let i = 0;
  while (i < lines.length) {
    const { code } = stripLineComment(lines[i] ?? "");
    const trimmed = code.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }
    if (isStartDecl(trimmed)) {
      defs.push({ source: "start()", startLine: i + 1, endLine: i + 1, kind: "start" });
      i += 1;
      continue;
    }
    const block = trimmed.match(/^([\p{L}_][\p{L}\p{N}\p{M}_]*)\s*\.\s*\{(.*)$/u);
    if (block) {
      const id = block[1]!;
      const startLine = i + 1;
      let buf = block[2] ?? "";
      if (buf.includes("}")) {
        const cut = buf.indexOf("}");
        defs.push({ source: id + ".{\n" + buf.slice(0, cut) + "\n}", startLine, endLine: i + 1, kind: "block" });
        i += 1;
        continue;
      }
      let end = i;
      while (end + 1 < lines.length) {
        end += 1;
        buf += "\n" + (lines[end] ?? "");
        if ((lines[end] ?? "").includes("}")) break;
      }
      const inner = buf.replace(/\}[^}]*$/, "");
      defs.push({ source: `${id}.{${inner}}`, startLine, endLine: end + 1, kind: "block" });
      i = end + 1;
      continue;
    }
    if (trimmed.startsWith(".")) {
      i += 1;
      continue;
    }
    let joined = trimmed;
    const startLine = i + 1;
    let end = i;
    while (end + 1 < lines.length) {
      const next = stripLineComment(lines[end + 1] ?? "").code.trim();
      if (!next.startsWith(".")) break;
      joined += next;
      end += 1;
    }
    defs.push({ source: joined, startLine, endLine: end + 1, kind: "dotted" });
    i = end + 1;
  }
  return { defs };
}

export function parseEntityLine(source: string, startLine = 1): Entity {
  const trimmed = source.trim();
  if (isStartDecl(trimmed)) return makeStartEntity();
  const block = trimmed.match(/^([\p{L}_][\p{L}\p{N}\p{M}_]*)\s*\.\s*\{([\s\S]*)\}\s*$/u);
  if (block) return parseBlockEntity(block[1]!, block[2] ?? "", startLine);
  return parseDottedEntity(source, startLine);
}

export function compileEntityFile(source: string): { worldModel: WorldModel; errors: Issue[]; warnings: Issue[] } {
  const { defs } = preprocessEntityFile(source);
  const worldModel: WorldModel = new Map();
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  for (const def of defs) {
    try {
      const entity = parseEntityLine(def.source, def.startLine);
      if (worldModel.has(entity.id)) {
        errors.push(makeIssue("E007", "error", { id: entity.id }, { file: FILE, line: def.startLine, column: 1 }));
        continue;
      }
      worldModel.set(entity.id, entity);
    } catch (err) {
      if (err instanceof ParseError) errors.push(...err.issues);
      else errors.push(makeIssue("E000", "error", { detail: err instanceof Error ? err.message : String(err) }, { file: FILE, line: def.startLine, column: 1 }));
    }
  }
  for (const entity of worldModel.values()) {
    for (const [key, target] of Object.entries(entity.links)) {
      if (target === "$") continue;
      if (worldModel.has(target)) continue;
      errors.push(makeIssue("E001", "error", { id: target }, { file: FILE, line: 1, column: 1 }));
      void key;
    }
  }
  return { worldModel, errors, warnings };
}

export function primaryTag(entity: Entity, taxonomy?: CompiledTaxonomy | null): string {
  const tags = effectiveTags(entity.tags, taxonomy);
  for (const tag of CATEGORY_TAGS) if (tags.has(tag)) return tag;
  if (entity.tags.has("hidden")) return "hidden";
  return [...entity.tags][0] ?? "outro";
}

export function groupEntitiesByPrimaryTag(world: WorldModel, taxonomy?: CompiledTaxonomy | null): Map<string, Entity[]> {
  const groups = new Map<string, Entity[]>();
  for (const tag of CATEGORY_TAGS) groups.set(tag, []);
  for (const entity of world.values()) {
    const tag = primaryTag(entity, taxonomy);
    const list = groups.get(tag) ?? [];
    list.push(entity);
    groups.set(tag, list);
  }
  return groups;
}

export function attachEntityExtras(world: WorldModel, extras: Record<string, Record<string, string>>): WorldModel {
  const next = cloneWorldModel(world);
  for (const [id, extra] of Object.entries(extras)) {
    const entity = next.get(id);
    if (!entity) continue;
    entity.extra = { ...(entity.extra ?? {}), ...extra };
  }
  return next;
}

export function serializeEntityBlock(entity: Entity): string {
  if (entity.id === "start" && [...entity.tags].every((t) => t === "hidden") && Object.keys(entity.stats).length === 0 && Object.keys(entity.links).length === 0) {
    return "start()";
  }
  const tags = [...entity.tags].join(", ");
  const stats = Object.entries(entity.stats)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  const links = Object.entries(entity.links)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  const name = entity.extra?.name ? `\nname: ${entity.extra.name};` : "";
  const desc = entity.extra?.description ? `\ndescription: ${JSON.stringify(entity.extra.description)};` : "";
  return `${entity.id}.{\ntags: ${tags};\nstats: ${stats};\nlinks: ${links};${name}${desc}\n}`;
}

export function blankEntityBlock(id: string): string {
  if (id.toLowerCase() === "start") return "start()";
  return `${id}.{\ntags:  ;\nstats: ;\nlinks: ;\n}`;
}
