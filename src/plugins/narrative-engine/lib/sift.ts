export type SiftPattern = {
  id: string;
  events: string[];
  name: string;
  extra?: Record<string, string>;
};

export type SiftHit = {
  id: string;
  name: string;
  at: number;
  weight?: number;
};

const PADRAO_HEAD = /^PADRAO\s+(\S+)/i;
const EVENTOS = /^(eventos|events)\s*:\s*(.*)$/i;
const NOME = /^(nome|name)\s*:\s*(.*)$/i;
const EXTRA = /^(extra)\s*:\s*(.*)$/i;
const SIGNIF = /^(significancia|weight|peso)\s*:\s*(.*)$/i;

function unquote(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) || (t.startsWith("'") && t.endsWith("'") && t.length >= 2)) {
    return t.slice(1, -1);
  }
  return t;
}

function splitEvents(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parsePadrao(source: string): SiftPattern[] {
  const out: SiftPattern[] = [];
  let current: { id: string; events: string[]; name: string; extra: Record<string, string> } | null = null;
  const flush = () => {
    if (current && current.events.length) {
      const extra = Object.keys(current.extra).length ? { ...current.extra } : undefined;
      out.push({
        id: current.id,
        events: current.events,
        name: current.name || current.id,
        extra,
      });
    }
    current = null;
  };
  for (const raw of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      if (!line) flush();
      continue;
    }
    const head = line.match(PADRAO_HEAD);
    if (head) {
      flush();
      current = { id: head[1]!, events: [], name: "", extra: {} };
      continue;
    }
    if (!current) continue;
    const ev = line.match(EVENTOS);
    if (ev) {
      current.events = splitEvents(ev[2] ?? "");
      continue;
    }
    const nome = line.match(NOME);
    if (nome) {
      current.name = unquote(nome[2] ?? "");
      continue;
    }
    const extra = line.match(EXTRA);
    if (extra) {
      for (const part of splitEvents(extra[2] ?? "")) {
        const eq = part.indexOf("=");
        if (eq < 0) continue;
        current.extra[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
      }
      continue;
    }
    const signif = line.match(SIGNIF);
    if (signif) current.extra.weight = unquote(signif[2] ?? "");
  }
  flush();
  return out;
}

export function matchSift(
  history: readonly { triggerId: string }[],
  patterns: readonly SiftPattern[],
): SiftHit[] {
  const hits: SiftHit[] = [];
  for (const pattern of patterns) {
    if (!pattern.events.length) continue;
    let n = 0;
    let at = -1;
    for (let i = 0; i < history.length; i++) {
      if (history[i]?.triggerId !== pattern.events[n]) continue;
      n += 1;
      if (n === pattern.events.length) {
        at = i;
        break;
      }
    }
    if (at >= 0) {
      const raw = pattern.extra?.weight;
      const weight = raw != null && raw !== "" ? Number(raw) : undefined;
      hits.push({
        id: pattern.id,
        name: pattern.name,
        at,
        weight: weight != null && Number.isFinite(weight) ? weight : undefined,
      });
    }
  }
  return hits;
}

export function bannerOf(hits: readonly SiftHit[]): string {
  return [...hits]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.at - b.at)
    .map((hit) => hit.name)
    .filter(Boolean)
    .join(" · ");
}
