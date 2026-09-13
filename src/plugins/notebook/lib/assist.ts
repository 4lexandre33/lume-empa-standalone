import { compileNotebook, slugOf, RULE_SLOW_THRESHOLD } from "./notebook.ts";
import { verbLabel } from "./verbs.ts";
import { parseCadernoLibrary } from "./pages.ts";

export { RULE_SLOW_THRESHOLD };

export type AssistWorldEntity = {
  id: string;
  tags: Iterable<string>;
  extra?: Record<string, string>;
  links?: Record<string, string>;
};

export type AssistWorld = {
  values(): Iterable<AssistWorldEntity>;
  get?: (id: string) => AssistWorldEntity | undefined;
} | null | undefined;

export type NotebookAssist = {
  notes: string[];
};

type EmittedRule = {
  on: string;
  ifs: string[];
  dos: string[];
  narrative: string;
};

const CODE_RE = /\b(ON:|IF:|DO:|matcher|JSON|ECS|intent=)/i;

export function slowRulesNote(count: number, threshold = RULE_SLOW_THRESHOLD): string | null {
  return count > threshold ? "Muitas regras; o play pode ficar lento." : null;
}

function prettyId(id: string): string {
  const words = id
    .replace(/^FUSE_/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (!words.length) return id.toLowerCase();
  const head = words[0]!;
  const article = /a$|ao$|ade$|agem$|ez$/.test(head) ? "a" : "o";
  return `${article} ${words.join(" ")}`;
}

function nounOf(id: string): string {
  return prettyId(id).replace(/^(o|a)\s+/, "");
}

function parseHeadings(text: string): { title: string; slug: string }[] {
  const out: { title: string; slug: string }[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!/^###\s+/.test(line)) continue;
    const title = line.replace(/^###\s+/, "").replace(/^\d+(?:\.\d+)*\s+/, "").trim();
    if (!title) continue;
    const slug = slugOf(title);
    out.push({ title, slug });
  }
  return out;
}

function parseEmittedRules(source: string): EmittedRule[] {
  const out: EmittedRule[] = [];
  let current: EmittedRule | null = null;
  const flush = () => {
    if (current && current.on) out.push(current);
    current = null;
  };
  for (const raw of source.split(/\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^PADRAO\b/i.test(line)) {
      flush();
      continue;
    }
    if (line.startsWith("#")) {
      flush();
      current = { on: "", ifs: [], dos: [], narrative: "" };
      continue;
    }
    if (!current) continue;
    if (/^ON:\s*/i.test(line)) current.on = line.replace(/^ON:\s*/i, "").trim();
    else if (/^IF:\s*/i.test(line)) current.ifs.push(line.replace(/^IF:\s*/i, "").trim());
    else if (/^DO:\s*/i.test(line)) current.dos.push(line.replace(/^DO:\s*/i, "").trim());
    else if (/^narrativa:\s*/i.test(line)) current.narrative = line.replace(/^narrativa:\s*/i, "").trim();
    else if (current.dos.length && !/^(THEN|LIVE|WAIT|TICK|EMIT|INTENT|KNOW)\b/.test(line)) current.dos.push(line);
  }
  flush();
  return out;
}

function parseEntities(source: string): { id: string; tags: Set<string>; name: string }[] {
  const out: { id: string; tags: Set<string>; name: string }[] = [];
  const blocks = source.split(/\n\n+/);
  for (const block of blocks) {
    const head = block.match(/^([A-Z][A-Z0-9_]*)\.\{/m);
    if (!head) continue;
    const tagsLine = block.match(/tags:\s*([^;]*);/);
    const nameLine = block.match(/name:\s*([^;]*);/);
    const tags = new Set(
      (tagsLine?.[1] ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    );
    out.push({ id: head[1]!, tags, name: (nameLine?.[1] ?? head[1]!).trim() });
  }
  return out;
}

function intentLeafOf(ifs: readonly string[]): string | null {
  for (const cond of ifs) {
    const m = cond.match(/intent=(\w+)/i);
    if (m) return m[1]!.toLowerCase();
  }
  return null;
}

function describeDos(dos: readonly string[]): string[] {
  const bits: string[] = [];
  for (const raw of dos) {
    const line = raw.trim();
    if (/^(LIVE|THEN|WAIT|TICK|EMIT|INTENT|KNOW)\b/.test(line)) continue;
    const hp = line.match(/\.hp\s+-\s+(\d+)/);
    if (hp) {
      bits.push(`dano ${hp[1]}`);
      continue;
    }
    const tag = line.match(/^[A-Z][A-Z0-9_]*\.([a-z][\p{L}\p{N}_]*)$/u);
    if (tag) {
      bits.push(`tag ${tag[1]}`);
      continue;
    }
  }
  return bits;
}

function worldList(world: AssistWorld): AssistWorldEntity[] {
  if (!world || typeof world.values !== "function") return [];
  return [...world.values()];
}

function hasTag(entity: AssistWorldEntity, tag: string): boolean {
  for (const item of entity.tags) if (item === tag) return true;
  return false;
}

function unique(notes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of notes) {
    if (!note || CODE_RE.test(note) || seen.has(note)) continue;
    seen.add(note);
    out.push(note);
  }
  return out;
}

export function assistNotebook(text: string, world?: AssistWorld): NotebookAssist {
  if (text === "") return { notes: [] };
  const nb = compileNotebook(text);
  const notes: string[] = [];
  const rules = parseEmittedRules(nb.rulesSource);
  const entities = parseEntities(nb.entitiesSource);
  const headings = parseHeadings(text);
  const existing = new Set(worldList(world).map((entity) => entity.id));
  const books = parseCadernoLibrary(text).books;
  if (books.length > 1) {
    notes.push(`Índice: ${books.map((book) => book.cover.title || "Caderno").join(", ")}.`);
  }

  for (const issue of nb.issues) {
    if (issue.message === "Não percebi esta linha." && issue.line != null) {
      notes.push(`Não percebi a linha ${issue.line}.`);
    } else {
      notes.push(issue.message);
    }
  }

  const slugCount = new Map<string, string[]>();
  for (const heading of headings) {
    const list = slugCount.get(heading.slug) ?? [];
    list.push(heading.title);
    slugCount.set(heading.slug, list);
  }
  for (const [slug, titles] of slugCount) {
    if (titles.length > 1 || existing.has(slug)) {
      notes.push(`Já há uma ${titles[0]}.`);
    }
  }

  const indexNew = headings.filter((heading) => !existing.has(heading.slug));
  if (indexNew.length > 5) {
    notes.push(`Índice com ${headings.length} secções.`);
  } else {
    for (const heading of indexNew) notes.push(`Adicionei ‘${heading.title}’ ao índice.`);
  }

  const groups = new Map<string, EmittedRule[]>();
  for (const rule of rules) {
    const key = `${rule.on}|${[...rule.ifs].sort().join(";")}`;
    const list = groups.get(key) ?? [];
    list.push(rule);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const rule = group[0]!;
    const leaf = intentLeafOf(rule.ifs);
    const action = leaf ? `${verbLabel(leaf)} ${prettyId(rule.on)}` : prettyId(rule.on);
    notes.push(`Duas reacções para ${action}; a mais específica ganha.`);
  }

  for (const rule of rules) {
    const leaf = intentLeafOf(rule.ifs);
    if (!leaf) continue;
    const bits = describeDos(rule.dos);
    if (!bits.length) continue;
    notes.push(`Se o jogador ${verbLabel(leaf)} ${prettyId(rule.on)}: ${bits.join(", ")}. Nenhuma acção foi executada.`);
  }

  const live = rules.some((rule) => rule.dos.some((line) => /^\s*LIVE\b/.test(line)));
  if (live) {
    const seen = new Set<string>();
    const consider = [
      ...entities.filter((entity) => entity.tags.has("vivo") && entity.id !== "JOGADOR"),
      ...worldList(world).filter((entity) => hasTag(entity, "vivo") && entity.id !== "JOGADOR"),
    ];
    for (const entity of consider) {
      if (seen.has(entity.id)) continue;
      seen.add(entity.id);
      const tags = entity.tags instanceof Set ? entity.tags : new Set(entity.tags);
      const covarde = tags.has("covarde") ? " (covarde)" : "";
      notes.push(`O ${nounOf(entity.id)} no mesmo sítio reagiria${covarde}.`);
    }
  }

  for (const entity of entities) {
    if (entity.id === "JOGADOR") continue;
    if (entity.tags.has("vivo") && !rules.some((rule) => rule.on === entity.id)) {
      notes.push(`O ${nounOf(entity.id)} é vivo e não tem reacção.`);
    }
    if (entity.tags.has("channel")) {
      const count = rules.filter((rule) => rule.on === entity.id).length;
      if (count < 2) notes.push(`O canal ${nounOf(entity.id)} não tem duas transições.`);
    }
  }

  const slow = slowRulesNote(rules.length);
  if (slow) notes.push(slow);

  if (nb.entitiesSource || rules.length) {
    notes.push("Pode exportar o caderno (.lume.caderno.md) ou partilhar com #play=.");
  }

  return { notes: unique(notes) };
}
