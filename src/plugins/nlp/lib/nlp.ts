import type { WorldModel } from "../../narrative-engine/types.ts";
import type { NlpHit } from "../types.ts";

const STOP = new Set(
  [
    "a",
    "o",
    "as",
    "os",
    "um",
    "uma",
    "uns",
    "umas",
    "the",
    "to",
    "at",
    "with",
    "on",
    "in",
    "into",
    "onto",
    "from",
    "of",
    "da",
    "das",
    "do",
    "dos",
    "de",
    "na",
    "nas",
    "no",
    "nos",
    "para",
    "pro",
    "pra",
    "com",
    "sobre",
    "em",
    "ao",
    "aos",
    "pelo",
    "pela",
    "and",
    "e",
    "then",
    "depois",
    "about",
    "up",
    "off",
  ].map(fold),
);

const DRY_PREFIXES = [
  "would i be able to",
  "am i able to",
  "is it possible to",
  "could i",
  "can i",
  "may i",
  "sera que posso",
  "sera que consigo",
  "poderia",
  "posso",
  "consigo",
].map(fold);

type Arity = 0 | 1 | 2 | "opt";

type Verb = {
  path: string;
  arity: Arity;
};

const VERBS: Record<string, Verb> = {};

function addVerb(keys: string[], path: string, arity: Arity): void {
  const verb = { path, arity };
  for (const key of keys) VERBS[fold(key)] = verb;
}

addVerb(["take", "get", "grab", "pick", "pegar", "pega", "pegue", "apanhar", "apanha", "segurar", "segura", "recolhe"], "action.interact.take", 1);
addVerb(["drop", "largar", "larga", "soltar", "solta", "deita"], "action.interact.drop", 1);
addVerb(["put", "insert", "guardar", "guarda", "por", "poe", "mete", "coloca", "meter"], "action.interact.put", 2);
addVerb(["give", "offer", "dar", "da", "oferece", "entrega"], "action.interact.give", 2);
addVerb(["open", "abrir", "abre"], "action.interact.open", 1);
addVerb(["close", "shut", "fechar", "fecha"], "action.interact.close", 1);
addVerb(["lock", "trancar", "tranca"], "action.interact.lock", 1);
addVerb(["unlock", "destrancar", "destranca"], "action.interact.unlock", 1);
addVerb(["use", "usar", "usa"], "action.interact.use", 1);
addVerb(["attack", "hit", "fight", "smash", "kill", "atacar", "ataca", "bater", "bate", "matar", "mata", "golpeia"], "action.interact.attack", 1);
addVerb(["talk", "speak", "greet", "hello", "falar", "fala", "conversar", "conversa", "oi", "ola"], "action.interact.talk", 1);
addVerb(["ask", "perguntar", "pergunta", "questiona"], "action.interact.ask", 2);
addVerb(["tell", "inform", "contar", "conta", "diz", "dizer"], "action.interact.tell", 2);
addVerb(["bye", "goodbye", "adeus", "tchau"], "action.interact.bye", 1);
addVerb(["go", "walk", "enter", "climb", "run", "ir", "vai", "move", "mover", "mova", "entra", "anda"], "action.go", 1);
addVerb(["look", "l", "olhar", "olha"], "action.look", 0);
addVerb(["inventory", "i", "inv", "inventario"], "action.inventory", 0);
addVerb(["wait", "z", "esperar", "espera", "aguarda", "aguardar"], "action.wait", 0);
addVerb(["communicate", "comunicar", "comunica"], "action.communicate", 1);
addVerb(["observe", "observar", "observa"], "perceive.observe", "opt");
addVerb(["inspect", "examine", "x", "check", "read", "inspecionar", "inspeciona", "examina", "examinar", "ler"], "perceive.inspect", 1);
addVerb(["listen", "escutar", "escuta", "ouve", "ouvir"], "perceive.listen", "opt");
addVerb(["locate", "find", "encontrar", "encontra"], "perceive.locate", 1);
addVerb(["remember", "recall", "lembrar", "lembra"], "cognize.remember", 1);

export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function looksLikeIntent(text: string): boolean {
  const head = text.trim().split(";")[0]?.trim() ?? "";
  if (!head) return false;
  return /^intent(?:\.|\s|$)/i.test(head);
}

export function splitPhrases(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (looksLikeIntent(trimmed)) return [trimmed];
  return trimmed
    .split(/(?:\s*(?:[.!?;]|\band then\b|\bthen\b|\be depois\b|\bdepois\b)\s*)+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, ""))
    .filter((token) => token.length > 0)
    .map(fold);
}

function stripDryRun(tokens: string[]): { tokens: string[]; dryRun: boolean } {
  const joined = tokens.join(" ");
  for (const prefix of DRY_PREFIXES) {
    if (joined === prefix || joined.startsWith(`${prefix} `)) {
      const rest = tokens.slice(prefix.split(" ").length);
      return { tokens: rest, dryRun: true };
    }
  }
  return { tokens, dryRun: false };
}

function needlesOf(world: WorldModel): { id: string; aliases: string[] }[] {
  const out: { id: string; aliases: string[] }[] = [];
  for (const entity of world.values()) {
    const aliases = new Set<string>([fold(entity.id)]);
    const named = entity.extra?.name;
    if (typeof named === "string" && named.trim()) aliases.add(fold(named.trim()));
    out.push({ id: entity.id, aliases: [...aliases] });
  }
  return out;
}

function matchAt(
  tokens: string[],
  start: number,
  needles: { id: string; aliases: string[] }[],
): { id: string; len: number } | "ambiguous" | null {
  for (let len = tokens.length - start; len >= 1; len--) {
    const span = tokens.slice(start, start + len).join(" ");
    const hits = needles.filter((needle) => needle.aliases.includes(span));
    if (hits.length === 1) return { id: hits[0]!.id, len };
    if (hits.length > 1) return "ambiguous";
  }
  return null;
}

function matchEntities(tokens: string[], world: WorldModel): string[] | null {
  const needles = needlesOf(world);
  const ids: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const hit = matchAt(tokens, i, needles);
    if (hit === "ambiguous") return null;
    if (hit) {
      ids.push(hit.id);
      i += hit.len;
      continue;
    }
    if (STOP.has(tokens[i]!)) {
      i += 1;
      continue;
    }
    return null;
  }
  return ids;
}

function commandOf(path: string, ids: string[]): string {
  const parts = ["intent", ...path.split("."), ...ids];
  return parts.filter(Boolean).join(".");
}

function phraseToCommand(phrase: string, world: WorldModel): { command: string; dryRun: boolean } | null {
  const stripped = stripDryRun(tokenize(phrase));
  if (stripped.tokens.length === 0) return null;
  const [head, ...rest] = stripped.tokens;
  const verb = VERBS[head ?? ""];
  if (!verb) return null;
  const ids = matchEntities(rest, world);
  if (!ids) return null;
  if (verb.arity === 0) {
    if (ids.length !== 0) return null;
    return { command: commandOf(verb.path, []), dryRun: stripped.dryRun };
  }
  if (verb.arity === 1) {
    if (ids.length !== 1) return null;
    return { command: commandOf(verb.path, ids), dryRun: stripped.dryRun };
  }
  if (verb.arity === 2) {
    if (ids.length !== 2) return null;
    return { command: commandOf(verb.path, ids), dryRun: stripped.dryRun };
  }
  if (ids.length === 0) {
    return { command: commandOf(verb.path, ["local"]), dryRun: stripped.dryRun };
  }
  if (ids.length === 1) {
    return { command: commandOf(verb.path, ids), dryRun: stripped.dryRun };
  }
  return null;
}

export function interpret(text: string, world: WorldModel): NlpHit | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (looksLikeIntent(trimmed)) return null;
  const phrases = splitPhrases(trimmed);
  if (phrases.length === 0) return null;
  const commands: string[] = [];
  let dryRun = false;
  for (const phrase of phrases) {
    if (looksLikeIntent(phrase)) return null;
    const hit = phraseToCommand(phrase, world);
    if (!hit) return null;
    commands.push(hit.command);
    if (hit.dryRun) dryRun = true;
  }
  return { command: commands.join("; "), dryRun };
}
