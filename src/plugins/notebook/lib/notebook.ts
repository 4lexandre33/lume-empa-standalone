import { intentLeaf } from "./verbs.ts";
import { compileNotebookCached, resetNotebookCache } from "./cache.ts";

export { resetNotebookCache, hashString } from "./cache.ts";

export type NotebookIssue = {
  severity: "error" | "warning";
  message: string;
  line?: number;
  code?: string;
};

export type NotebookCompile = {
  entitiesSource: string;
  rulesSource: string;
  taxonomySource: string;
  extras: Record<string, Record<string, string>>;
  patterns: string;
  issues: NotebookIssue[];
  dirty: string[];
};

export const EMPTY_NOTEBOOK: NotebookCompile = {
  entitiesSource: "",
  rulesSource: "",
  taxonomySource: "",
  extras: {},
  patterns: "",
  issues: [],
  dirty: [],
};

export const RULE_SLOW_THRESHOLD = 500;

type Draft = {
  id: string;
  name: string;
  tags: Set<string>;
  links: Record<string, string>;
  extra: Record<string, string>;
  stats: Record<string, number>;
};

type RuleDraft = {
  id: string;
  on: string;
  ifs: string[];
  dos: string[];
  narrative: string;
};

type PatternDraft = {
  id: string;
  name: string;
  events: string[];
  weight?: string;
};

type SectionKind = "place" | "object" | "agent" | "channel" | "story" | null;

const DIRS: Record<string, string> = {
  norte: "n",
  sul: "s",
  este: "e",
  leste: "e",
  oeste: "w",
  nordeste: "ne",
  noroeste: "nw",
  sudeste: "se",
  sudoeste: "sw",
  cima: "u",
  acima: "u",
  baixo: "d",
  abaixo: "d",
  dentro: "in",
  fora: "out",
};

const OPPOSITE: Record<string, string> = {
  n: "s",
  s: "n",
  e: "w",
  w: "e",
  ne: "sw",
  sw: "ne",
  nw: "se",
  se: "nw",
  u: "d",
  d: "u",
  in: "out",
  out: "in",
};

const TAG_WORDS: Record<string, string[]> = {
  arma: ["object", "weapon"],
  weapon: ["object", "weapon"],
  objeto: ["object"],
  objecto: ["object"],
  amaldicoada: ["cursed"],
  amaldicoado: ["cursed"],
  cursed: ["cursed"],
  hostil: ["agent", "vivo", "hostile"],
  hostile: ["agent", "vivo", "hostile"],
  covarde: ["agent", "vivo", "covarde"],
  consumivel: ["object"],
};

const PERSON_WORDS = new Set([
  "goblin",
  "guarda",
  "rei",
  "rainha",
  "filho",
  "filha",
  "mago",
  "npc",
  "jogador",
  "homem",
  "mulher",
  "pessoa",
  "orc",
  "troll",
  "aldeao",
  "padre",
  "soldado",
  "capitao",
]);

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function stripArticle(text: string): string {
  return text.replace(/^(o|a|os|as|um|uma|uns|umas)\s+/i, "").trim();
}

export function slugOf(name: string): string {
  const core = stripArticle(name.trim());
  const folded = core
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
  return folded.toUpperCase();
}

function stripHeadingNumber(title: string): string {
  return title.replace(/^\d+(?:\.\d+)*\s+/, "").trim();
}

const NAME_STOP = new Set(["de", "da", "do", "das", "dos", "e", "ou", "em", "no", "na", "nos", "nas"]);

const AMBIG = "*";

type Heading = { line: number; level: 2 | 3; title: string; number: string | null; active: boolean };

function parseHeadingTitle(raw: string): { number: string | null; title: string } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d+(?:\.\d+)*)\s+(.*)$/);
  if (m) return { number: m[1]!, title: m[2]!.trim() };
  return { number: null, title: trimmed };
}

function ofPhrase(name: string): string | null {
  const f = fold(stripArticle(name));
  const m = f.match(/^(.+?)\s+d(?:a|o|e|as|os)\s+(.+)$/);
  return m ? m[2]!.trim() : null;
}

function headNoun(name: string): string {
  const parts = fold(stripArticle(name))
    .split(/\s+/)
    .filter((w) => w && !NAME_STOP.has(w));
  return parts[0] ?? fold(stripArticle(name));
}

function kindFromSection(title: string): SectionKind {
  const f = fold(stripHeadingNumber(title));
  if (/(^|\b)(sala|salas|lugar|lugares)(\b|$)/.test(f)) return "place";
  if (/(^|\b)(objeto|objecto|objetos|objectos|item|itens)(\b|$)/.test(f)) return "object";
  if (/(^|\b)(pessoa|pessoas|gente|npc|npcs|agente|agentes)(\b|$)/.test(f)) return "agent";
  if (/(^|\b)(canal|canais|channel|channels)(\b|$)/.test(f)) return "channel";
  if (/(^|\b)(historia|historias|padrao|padroes|story|stories)(\b|$)/.test(f)) return "story";
  return null;
}

function isSkipLine(folded: string): boolean {
  if (!folded) return true;
  if (folded === "---") return true;
  if (/^(caderno|autora|autor|data|dedicatoria)\b/.test(folded)) return true;
  if (/^(activa|ativa)\s*:/.test(folded)) return true;
  if (/^peso\s*:/.test(folded)) return true;
  if (/^\d+\.\s+\S+$/.test(folded)) return true;
  return false;
}

function isDeferredLine(folded: string): boolean {
  return /^a cada turno\b/.test(folded);
}

function quoteNarr(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function emitDraft(draft: Draft): string {
  const tags = [...draft.tags].sort().join(", ");
  const links = Object.entries(draft.links)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  const stats = Object.entries(draft.stats)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  const lines = [`${draft.id}.{`, `tags: ${tags};`];
  if (stats) lines.push(`stats: ${stats};`);
  lines.push(`links: ${links};`, `name: ${draft.name};`);
  if (draft.extra.description) lines.push(`description: ${draft.extra.description};`);
  lines.push("}");
  return lines.join("\n");
}

function emitPattern(pattern: PatternDraft): string {
  const lines = [`PADRAO ${pattern.id}`];
  if (pattern.events.length) lines.push(`  eventos: ${pattern.events.join(", ")}`);
  if (pattern.name) lines.push(`  nome: ${pattern.name}`);
  if (pattern.weight) lines.push(`  extra: weight=${pattern.weight}`);
  return lines.join("\n");
}

function emitRule(rule: RuleDraft): string {
  const lines = [`# ${rule.id}`, `ON: ${rule.on}`];
  for (const cond of rule.ifs) lines.push(`IF: ${cond}`);
  if (rule.dos.length) {
    lines.push(`DO: ${rule.dos[0]}`);
    for (const change of rule.dos.slice(1)) lines.push(`    ${change}`);
  }
  if (rule.narrative) lines.push(`narrativa: ${quoteNarr(rule.narrative)}`);
  return lines.join("\n");
}

function parseHpSe(folded: string): string | null {
  const m = folded.match(/menos de\s+(\d+)\s+de vida/);
  return m ? `JOGADOR.hp<${m[1]}` : null;
}

export function compileNotebookFresh(text: string): NotebookCompile {
  if (text === "") {
    return {
      entitiesSource: "",
      rulesSource: "",
      taxonomySource: "",
      extras: {},
      patterns: "",
      issues: [],
      dirty: [],
    };
  }

  const drafts = new Map<string, Draft>();
  const order: string[] = [];
  const aliases = new Map<string, string>();
  const issues: NotebookIssue[] = [];
  const rules: RuleDraft[] = [];
  let currentId: string | null = null;
  let sectionKind: SectionKind = null;
  const frames: { rule: RuleDraft; indent: number }[] = [];
  let ruleSerial = 0;
  const patternDrafts: PatternDraft[] = [];
  let currentPattern: PatternDraft | null = null;
  let currentChannelId: string | null = null;
  let collectingStates = false;
  let collectingTransitions = false;
  let patternSerial = 0;

  const remember = (id: string, name: string, line?: number) => {
    const keys = [fold(name), fold(stripArticle(name)), fold(id.replace(/_/g, " "))];
    const head = headNoun(name);
    if (head) keys.push(head);
    for (const key of keys) {
      if (!key) continue;
      const prev = aliases.get(key);
      if (!prev) aliases.set(key, id);
      else if (prev !== id && prev !== AMBIG) {
        aliases.set(key, AMBIG);
        if (line != null) {
          issues.push({
            severity: "error",
            code: "E020",
            message: `«${stripArticle(name)}» é ambíguo.`,
            line,
          });
        }
      }
    }
  };

  const lookupName = (raw: string): string | typeof AMBIG | null => {
    const folded = fold(raw);
    const hit = aliases.get(folded) ?? aliases.get(fold(stripArticle(raw)));
    return hit ?? null;
  };

  const ensure = (rawName: string, fallbackName?: string, forcedId?: string): Draft => {
    const name = fallbackName ?? stripHeadingNumber(rawName).trim();
    const id =
      forcedId ??
      (fold(stripArticle(rawName)) === "jogador" || rawName === "JOGADOR" ? "JOGADOR" : slugOf(name));
    let draft = drafts.get(id);
    if (!draft) {
      draft = { id, name: id === "JOGADOR" ? "Jogador" : name, tags: new Set(), links: {}, extra: {}, stats: {} };
      if (id === "JOGADOR") draft.tags.add("agent");
      drafts.set(id, draft);
      order.push(id);
    }
    remember(id, name);
    remember(id, rawName);
    return draft;
  };

  const resolve = (raw: string, line?: number): string | null => {
    const trimmed = raw.trim();
    const folded = fold(trimmed);
    if (folded === "ela" || folded === "ele" || folded === "isso" || folded === "isto") return currentId;
    if (folded === "o jogador" || folded === "jogador" || folded === "a jogadora") return "JOGADOR";
    const hit = lookupName(trimmed);
    if (hit === AMBIG) {
      if (line != null) {
        issues.push({
          severity: "error",
          code: "E020",
          message: `«${stripArticle(trimmed)}» é ambíguo.`,
          line,
        });
      }
      return null;
    }
    if (hit) return hit;
    const id = slugOf(trimmed);
    return id || null;
  };

  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  const headings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? "").replace(/\/\/.*$/, "").trim();
    if (/^###\s+/.test(trimmed)) {
      const parsed = parseHeadingTitle(trimmed.replace(/^###\s+/, ""));
      headings.push({ line: i + 1, level: 3, title: parsed.title, number: parsed.number, active: true });
    } else if (/^##\s+/.test(trimmed)) {
      const parsed = parseHeadingTitle(trimmed.replace(/^##\s+/, ""));
      headings.push({ line: i + 1, level: 2, title: parsed.title, number: parsed.number, active: true });
    }
  }
  for (const h of headings) {
    for (let i = h.line; i < lines.length; i++) {
      const trimmed = (lines[i] ?? "").replace(/\/\/.*$/, "").trim();
      if (!trimmed) continue;
      const meta = fold(trimmed).match(/^(activa|ativa)\s*:\s*(.+)$/);
      if (meta) {
        const value = fold(meta[2] ?? "");
        h.active = !/^(nao|no|off|0|false)$/.test(value);
      }
      break;
    }
  }

  const liveAt = (lineNo: number): boolean => {
    let sectionOn = true;
    let itemOn = true;
    for (const h of headings) {
      if (h.line > lineNo) break;
      if (h.level === 2) {
        sectionOn = h.active;
        itemOn = true;
      } else itemOn = h.active;
    }
    return sectionOn && itemOn;
  };

  const headingSectionKind = (h: Heading): SectionKind => {
    let kind: SectionKind = null;
    for (const item of headings) {
      if (item.line > h.line) break;
      if (item.level === 2) kind = kindFromSection(item.title);
    }
    return kind;
  };

  const idByLine = new Map<number, string>();
  for (const h of headings) {
    if (h.level !== 3 || !liveAt(h.line)) continue;
    if (headingSectionKind(h) === "story") continue;
    let id = slugOf(h.title);
    const of = ofPhrase(h.title);
    if (of) {
      const found = lookupName(of);
      if (found === AMBIG) {
        issues.push({
          severity: "error",
          code: "E020",
          message: `«${of}» é ambíguo.`,
          line: h.line,
        });
      } else if (found) id = found;
    }
    idByLine.set(h.line, id);
    remember(id, h.title, h.line);
    if (h.number) aliases.set(fold(h.number), aliases.get(fold(h.number)) ?? id);
  }
  for (const h of headings) {
    if (h.level !== 3 || !liveAt(h.line) || headingSectionKind(h) === "story") continue;
    const of = ofPhrase(h.title);
    if (!of) continue;
    const found = lookupName(of);
    const mine = idByLine.get(h.line);
    if (!found || found === AMBIG || !mine || found === mine) continue;
    idByLine.set(h.line, found);
    for (const [key, value] of aliases) {
      if (value === mine) aliases.set(key, found);
    }
    remember(found, h.title, h.line);
  }

  const headingExists = (query: string): boolean => {
    const stripped = fold(query)
      .replace(/^(secao|secção|seção)\s+/i, "")
      .trim();
    const split = stripped.split(/\s*[—–-]\s*/);
    const num = split[0]?.match(/^(\d+(?:\.\d+)*)$/);
    if (num && headings.some((h) => h.number === num[1])) return true;
    const title = (split.length > 1 ? split.slice(1).join(" - ") : stripped).trim();
    if (!title) return false;
    if (headings.some((h) => fold(h.title) === title || fold(stripArticle(h.title)) === title)) return true;
    const hit = lookupName(title);
    return Boolean(hit && hit !== AMBIG);
  };

  const markKind = (draft: Draft, kind: "place" | "object" | "agent") => {
    if (kind === "place") draft.tags.add("place");
    if (kind === "object") draft.tags.add("object");
    if (kind === "agent") {
      draft.tags.add("agent");
      draft.tags.add("vivo");
    }
  };

  const looksPerson = (name: string): boolean => {
    const head = fold(stripArticle(name)).split(/\s+/)[0] ?? "";
    return PERSON_WORDS.has(head);
  };

  const closeAt = (indent: number) => {
    while (frames.length && frames[frames.length - 1]!.indent >= indent) {
      const rule = frames.pop()!.rule;
      if (rule.dos.length || rule.narrative || rule.ifs.length) rules.push(rule);
    }
  };

  const closeRule = () => closeAt(0);

  const top = (): RuleDraft | null => frames[frames.length - 1]?.rule ?? null;

  const frameFor = (indent: number): RuleDraft | null => {
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i]!.indent < indent) return frames[i]!.rule;
    }
    return null;
  };

  const pushFrame = (rule: RuleDraft, indent: number) => {
    frames.push({ rule, indent });
  };

  const addDo = (rule: RuleDraft, line: string) => {
    if (!rule.dos.includes(line)) rule.dos.push(line);
  };

  const chainVerb = (subjectId: string, timed: boolean): string => {
    const draft = drafts.get(subjectId);
    if (draft?.tags.has("vivo")) return "LIVE";
    if (draft?.tags.has("channel")) return `THEN ${subjectId}`;
    if (timed) {
      ruleSerial += 1;
      return `WAIT 1.FUSE_${subjectId}_${ruleSerial}`;
    }
    return `THEN ${subjectId}`;
  };

  const warn = (line: number) => {
    issues.push({ severity: "warning", message: "Não percebi esta linha.", line });
  };

  const flushPattern = () => {
    if (currentPattern && currentPattern.events.length) patternDrafts.push(currentPattern);
    currentPattern = null;
  };

  const beginPattern = (name: string, forcedId?: string) => {
    flushPattern();
    const title = name.trim();
    patternSerial += 1;
    const id = forcedId || (title ? slugOf(title) : `PADRAO_${patternSerial}`);
    currentPattern = { id, name: title || id, events: [] };
  };

  const markChannel = (id: string) => {
    const draft = drafts.get(id);
    if (!draft) return;
    draft.tags.add("channel");
    if (draft.stats.state == null) draft.stats.state = 0;
  };

  const eventIdOf = (raw: string, lineNo?: number): string => {
    const hit = resolve(raw, lineNo);
    return hit ?? slugOf(raw);
  };

  const parseCanal = (trimmed: string): boolean => {
    const m = trimmed.match(/^(?:o|a)\s+canal\s+["“«]?([^"”»:]+?)["”»]?\s+tem\s+(.+?)\s+estados?:?\s*$/iu);
    if (!m) return false;
    closeRule();
    flushPattern();
    const name = m[1]!.trim();
    const draft = ensure(name);
    markChannel(draft.id);
    currentId = draft.id;
    currentChannelId = draft.id;
    collectingStates = true;
    collectingTransitions = false;
    return true;
  };

  const parseTransition = (trimmed: string, lineNo: number): boolean => {
    const m = trimmed.match(/^(.+?)\s*(?:→|->)\s+(.+?)(?:\s*\((.+)\))?\s*$/u);
    if (!m || !currentChannelId) return false;
    const channel = drafts.get(currentChannelId);
    if (!channel) return false;
    const states = (channel.extra.states ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const fromName = fold(stripArticle(m[1]!.trim()));
    const toName = fold(stripArticle(m[2]!.trim()));
    const from = states.findIndex((s) => fold(s) === fromName);
    const to = states.findIndex((s) => fold(s) === toName);
    if (from < 0 || to < 0) {
      warn(lineNo);
      return true;
    }
    const delta = to - from;
    ruleSerial += 1;
    const dos = [`${channel.id}.state ${delta >= 0 ? "+" : "-"} ${Math.abs(delta)}`];
    const destTag = slugOf(states[to] ?? "").toLowerCase();
    if (destTag) dos.push(`${channel.id}.${destTag}`);
    rules.push({
      id: `r_canal_${channel.id.toLowerCase()}_${ruleSerial}`,
      on: channel.id,
      ifs: [`${channel.id}.state=${from}`, `${channel.id}.intent=advance`],
      dos,
      narrative: (m[3] ?? "").trim(),
    });
    return true;
  };

  const parseBullet = (trimmed: string, lineNo: number): boolean => {
    const m = trimmed.match(/^[-*]\s+(.+)$/);
    if (!m) return false;
    const item = m[1]!.trim();
    if (currentPattern) {
      currentPattern.events.push(eventIdOf(item, lineNo));
      return true;
    }
    if (currentChannelId && collectingStates) {
      const channel = drafts.get(currentChannelId);
      if (!channel) return true;
      const label = fold(stripArticle(item));
      const prev = channel.extra.states ? channel.extra.states.split(", ").filter(Boolean) : [];
      if (!prev.includes(label)) prev.push(label);
      channel.extra.states = prev.join(", ");
      return true;
    }
    return false;
  };

  const applyBody = (trimmed: string, lineNo: number, indent: number): boolean => {
    const target = frameFor(indent);
    if (!target) return false;
    const folded = fold(trimmed);
    if (/^padrao\b/.test(folded)) {
      warn(lineNo);
      return true;
    }
    if (/^a cada turno:?$/.test(folded)) {
      const chain = chainVerb(target.on, true);
      addDo(target, chain);
      if (chain.startsWith("WAIT ")) {
        const fuseId = chain.replace(/^WAIT \d+\./, "");
        pushFrame({ id: `r_turno_${fuseId.toLowerCase()}`, on: fuseId, ifs: [], dos: [], narrative: "" }, indent);
      }
      return true;
    }
    if (
      /^os npcs? (ao redor|a volta|em volta|a redor)\b/.test(folded) ||
      /\bficam preocupad/.test(folded)
    ) {
      addDo(target, "LIVE");
      return true;
    }
    const hp = parseHpSe(folded);
    if (/^se\b/.test(folded) && hp) {
      target.ifs.push(hp);
      return true;
    }
    const narre = trimmed.match(/^narre\s+["“«](.+?)["”»]\s*\.?$/iu);
    if (narre) {
      target.narrative = narre[1]!;
      return true;
    }
    const cause = trimmed.match(/^cause\s+(\d+)\s+de dano\s+(?:ao|a|à|para)\s+(.+?)\.?$/iu);
    if (cause) {
      const who = resolve(cause[2]!, lineNo);
      if (!who) return true;
      ensure(cause[2]!, cause[2], who);
      target.dos.push(`${who}.hp - ${cause[1]}`);
      return true;
    }
    const marque = trimmed.match(/^marque\s+(.+?)\s+como\s+["“]?([^"”]+)["”]?\s*\.?$/iu);
    if (marque) {
      const who = resolve(marque[1]!, lineNo);
      if (!who) return true;
      const tag = slugOf(marque[2]!).toLowerCase();
      ensure(marque[1]!, marque[1], who);
      target.dos.push(`${who}.${tag}`);
      return true;
    }
    warn(lineNo);
    return true;
  };

  const startQuando = (trimmed: string, lineNo: number, indent: number): boolean => {
    const folded = fold(trimmed.replace(/:$/, ""));
    if (!folded.startsWith("quando ")) return false;
    closeAt(indent);
    const parent = indent > 0 ? top() : null;
    const rest = trimmed.replace(/^quando\s+/i, "").replace(/:$/, "").trim();
    const restFold = fold(rest);
    const marked = restFold.match(/^(.+?)\s+e marcad[oa] como\s+["']?(.+?)["']?$/);
    if (marked) {
      const subjectId = resolve(marked[1]!, lineNo);
      if (!subjectId) {
        if (!issues.some((issue) => issue.line === lineNo && issue.code === "E020")) warn(lineNo);
        return true;
      }
      const tag = slugOf(marked[2]!).toLowerCase();
      ensure(marked[1]!, marked[1], subjectId);
      if (parent) addDo(parent, chainVerb(subjectId, false));
      ruleSerial += 1;
      pushFrame(
        {
          id: `r_${subjectId.toLowerCase()}_${tag}_${ruleSerial}`,
          on: subjectId,
          ifs: [`${subjectId}.${tag}`],
          dos: [],
          narrative: "",
        },
        indent,
      );
      return true;
    }
    const acted = rest.match(/^(?:o|a)\s+jogador(?:a)?\s+(\S+)\s+(?:o|a|os|as)?\s*(.+)$/i);
    if (acted) {
      const leaf = intentLeaf(acted[1]!);
      if (!leaf) {
        warn(lineNo);
        return true;
      }
      const objectId = resolve(acted[2]!, lineNo);
      if (!objectId) {
        if (!issues.some((issue) => issue.line === lineNo && issue.code === "E020")) warn(lineNo);
        return true;
      }
      ensure(acted[2]!, acted[2], objectId);
      ensure("JOGADOR");
      if (parent) addDo(parent, chainVerb(objectId, false));
      ruleSerial += 1;
      pushFrame(
        {
          id: `r_${leaf}_${objectId.toLowerCase()}_${ruleSerial}`,
          on: objectId,
          ifs: [`JOGADOR.intent=${leaf}`],
          dos: [],
          narrative: "",
        },
        indent,
      );
      return true;
    }
    warn(lineNo);
    return true;
  };

  const startSe = (trimmed: string, lineNo: number, indent: number): boolean => {
    const folded = fold(trimmed.replace(/:$/, ""));
    if (!folded.startsWith("se ")) return false;
    const hp = parseHpSe(folded);
    if (!hp) {
      warn(lineNo);
      return true;
    }
    if (indent > 0 && top()) {
      top()!.ifs.push(hp);
      return true;
    }
    closeAt(indent);
    ensure("JOGADOR");
    ruleSerial += 1;
    pushFrame(
      {
        id: `r_hp_${ruleSerial}`,
        on: "JOGADOR",
        ifs: [hp],
        dos: [],
        narrative: "",
      },
      indent,
    );
    return true;
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i] ?? "";
    const withoutComment = raw.replace(/\/\/.*$/, "");
    const indent = (withoutComment.match(/^\s*/)?.[0].length ?? 0);
    const trimmed = withoutComment.trim();
    const folded = fold(trimmed);
    if (/^caderno\s*:/.test(folded)) {
      closeRule();
      flushPattern();
      collectingStates = false;
      collectingTransitions = false;
      currentChannelId = null;
      currentId = null;
      frames.length = 0;
      continue;
    }
    if (isSkipLine(folded)) continue;
    if (!liveAt(lineNo)) continue;

    if (indent > 0 && frames.length) {
      if (startQuando(trimmed, lineNo, indent)) continue;
      if (startSe(trimmed, lineNo, indent)) continue;
      applyBody(trimmed, lineNo, indent);
      continue;
    }

    if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
      closeRule();
      flushPattern();
      collectingStates = false;
      collectingTransitions = false;
      currentChannelId = null;
      sectionKind = kindFromSection(trimmed.replace(/^##\s+/, ""));
      currentId = null;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      closeRule();
      const title = stripHeadingNumber(trimmed.replace(/^###\s+/, "").trim());
      if (sectionKind === "story") {
        beginPattern(title);
        currentId = null;
        continue;
      }
      const id = idByLine.get(lineNo) ?? slugOf(title);
      const draft = ensure(title, title, id);
      currentId = draft.id;
      if (sectionKind === "place" || sectionKind === "object" || sectionKind === "agent") markKind(draft, sectionKind);
      if (sectionKind === "channel") {
        markChannel(draft.id);
        currentChannelId = draft.id;
        collectingStates = true;
        collectingTransitions = false;
      }
      remember(draft.id, title, lineNo);
      continue;
    }

    const veja = folded.match(/^veja tambem:?\s*(.*)$/);
    if (veja) {
      closeRule();
      const target = veja[1]!.replace(/[.:]+$/, "").trim();
      if (!target || !headingExists(target)) {
        issues.push({
          severity: "warning",
          code: "W014",
          message: `Não encontrei «${target || "?"}».`,
          line: lineNo,
        });
      }
      continue;
    }

    const aka = trimmed.match(/^também chamada:?\s+(.+?)\.?$/iu) ?? trimmed.match(/^tambem chamada:?\s+(.+?)\.?$/iu);
    if (aka) {
      closeRule();
      if (!currentId) warn(lineNo);
      else remember(currentId, aka[1]!.trim(), lineNo);
      continue;
    }

    if (/^transicoes:?$/.test(folded) || /^transições:?$/.test(trimmed.toLowerCase())) {
      closeRule();
      collectingStates = false;
      collectingTransitions = Boolean(currentChannelId);
      continue;
    }

    const padraoHead = trimmed.match(/^(padr[aã]o)\s*:?\s*(.*)$/iu);
    if (padraoHead && !frames.length) {
      closeRule();
      collectingStates = false;
      collectingTransitions = false;
      beginPattern((padraoHead[2] ?? "").trim());
      continue;
    }

    const signif = trimmed.match(/^signific[aâ]ncia\s*:\s*([0-9]+(?:[.,][0-9]+)?)\s*$/iu);
    if (signif && currentPattern) {
      currentPattern.weight = signif[1]!.replace(",", ".");
      continue;
    }

    if (parseCanal(trimmed)) continue;
    if (parseBullet(trimmed, lineNo)) continue;
    if (collectingTransitions && parseTransition(trimmed, lineNo)) continue;

    if (startQuando(trimmed, lineNo, indent)) continue;
    if (startSe(trimmed, lineNo, indent)) continue;

    if (isDeferredLine(folded)) {
      closeRule();
      warn(lineNo);
      continue;
    }

    closeRule();

    const leva = trimmed.match(
      /^(?:(o|a|os|as)\s+)?(.+?)\s+leva ao\s+(\p{L}+)\s+para\s+(?:(o|a|os|as)\s+)?(.+?)\.?\s*$/iu,
    );
    if (leva) {
      const fromName = leva[2]!;
      const dirWord = fold(leva[3]!);
      const toName = leva[5]!;
      const dir = DIRS[dirWord];
      if (!dir) {
        warn(lineNo);
        continue;
      }
      const fromId = resolve(fromName, lineNo);
      const toId = resolve(toName, lineNo);
      if (!fromId || !toId) continue;
      const from = ensure(fromName, fromName, fromId);
      const to = ensure(toName, toName, toId);
      markKind(from, "place");
      markKind(to, "place");
      from.links[`exit_${dir}`] = to.id;
      const back = OPPOSITE[dir];
      if (back) to.links[`exit_${back}`] = from.id;
      currentId = from.id;
      continue;
    }

    const esta = trimmed.match(
      /^(?:(o|a|os|as)\s+)?(.+?)\s+est[aá]\s+(?:n[ao]|em)\s+(?:(o|a|os|as)\s+)?(.+?)\.?\s*$/iu,
    );
    if (esta) {
      const subjectName = esta[2]!;
      const placeName = esta[4]!;
      const subjectId = resolve(subjectName, lineNo);
      const placeId = resolve(placeName, lineNo);
      if (!subjectId || !placeId) continue;
      const subject = ensure(subjectName, subjectName, subjectId);
      const place = ensure(placeName, placeName, placeId);
      markKind(place, "place");
      subject.links.in = place.id;
      if (sectionKind === "agent" || looksPerson(subjectName)) markKind(subject, "agent");
      else if (sectionKind === "object") markKind(subject, "object");
      else if (!subject.tags.has("place") && !subject.tags.has("agent")) markKind(subject, "object");
      currentId = subject.id;
      continue;
    }

    const eh = trimmed.match(/^(ela|ele|isso|isto|(?:o|a|os|as)\s+.+?|.+?)\s+é\s+(.+?)\.?\s*$/iu);
    if (eh) {
      const subjectRaw = eh[1]!;
      const pred = eh[2]!;
      const subjectId = resolve(subjectRaw, lineNo);
      if (!subjectId) {
        if (!issues.some((issue) => issue.line === lineNo && issue.code === "E020")) warn(lineNo);
        continue;
      }
      const owned = drafts.get(subjectId) ?? ensure(subjectRaw, subjectRaw, subjectId);
      const stripped = pred.replace(/^(uma?|uns|umas)\s+/i, "");
      const parts = stripped.split(/\s+e\s+|,\s*/).map((part) => part.trim()).filter(Boolean);
      let tagged = false;
      for (const part of parts) {
        const tags = TAG_WORDS[fold(part)];
        if (!tags) continue;
        tagged = true;
        for (const tag of tags) owned.tags.add(tag);
      }
      if (!tagged) {
        const sentence = trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
        owned.extra.description = owned.extra.description ? `${owned.extra.description} ${sentence}` : sentence;
        if (!owned.tags.has("object") && !owned.tags.has("agent")) owned.tags.add("place");
      }
      currentId = owned.id;
      continue;
    }

    warn(lineNo);
  }
  closeRule();
  flushPattern();

  const extras: Record<string, Record<string, string>> = {};
  for (const id of order) {
    const draft = drafts.get(id);
    if (!draft) continue;
    const extra: Record<string, string> = {};
    if (draft.extra.states) extra.states = draft.extra.states;
    if (Object.keys(extra).length) extras[id] = extra;
  }
  for (const pattern of patternDrafts) {
    if (pattern.weight) extras[pattern.id] = { ...(extras[pattern.id] ?? {}), weight: pattern.weight };
  }

  const hasChannel = order.some((id) => drafts.get(id)?.tags.has("channel"));
  const patterns = patternDrafts.map(emitPattern).join("\n\n");
  const entitiesSource = order.map((id) => emitDraft(drafts.get(id)!)).join("\n\n");
  const compiledRules = rules.map(emitRule).join("\n\n");
  const rulesSource = [compiledRules, patterns].filter(Boolean).join("\n\n");
  if (rules.length > RULE_SLOW_THRESHOLD) {
    issues.push({
      severity: "warning",
      code: "W021",
      message: "Muitas regras; o play pode ficar lento.",
    });
  }
  return {
    entitiesSource,
    rulesSource,
    taxonomySource: hasChannel ? "channel → abstract\n" : "",
    extras,
    patterns,
    issues,
    dirty: [],
  };
}

export function compileNotebook(text: string): NotebookCompile {
  if (text === "") return EMPTY_NOTEBOOK;
  return compileNotebookCached(text, compileNotebookFresh);
}
