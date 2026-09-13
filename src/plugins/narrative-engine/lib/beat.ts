import type { Rule, RuleMatch } from "./rule-engine.ts";

export type BeatCandidate = { ruleId: string; score: number };
export type BeatVivo = { id: string; ruleId: string | null };
export type BeatTrace = {
  triggerId: string;
  ruleId: string | null;
  candidates: BeatCandidate[];
  effects: string[];
  vivos: BeatVivo[];
};

export function emptyBeat(triggerId = ""): BeatTrace {
  return { triggerId, ruleId: null, candidates: [], effects: [], vivos: [] };
}

export function verbsOf(rule: Rule | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const op of rule?.effects ?? []) {
    const verb = op.verb.trim().toUpperCase();
    if (!verb || seen.has(verb)) continue;
    seen.add(verb);
    out.push(verb);
  }
  return out;
}

export function candidatesOf(matches: readonly RuleMatch[]): BeatCandidate[] {
  return matches.map((item) => ({ ruleId: item.rule.id, score: item.score }));
}

export function matchTrace(triggerId: string, rule: Rule | null, matches: readonly RuleMatch[]): BeatTrace {
  return {
    triggerId,
    ruleId: rule?.id ?? null,
    candidates: candidatesOf(matches),
    effects: verbsOf(rule),
    vivos: [],
  };
}

export function vivosFromHistory(
  extra: readonly { triggerId: string; ruleId: string | null }[],
  world: { get(id: string): { tags: Set<string> } | undefined },
): BeatVivo[] {
  const out: BeatVivo[] = [];
  const seen = new Set<string>();
  for (const beat of extra) {
    if (seen.has(beat.triggerId)) continue;
    if (!world.get(beat.triggerId)?.tags.has("vivo")) continue;
    seen.add(beat.triggerId);
    out.push({ id: beat.triggerId, ruleId: beat.ruleId });
  }
  return out;
}

export function formatBeat(trace: BeatTrace, intent?: string): string {
  const command = (intent && intent.trim()) || trace.triggerId || "—";
  const cands = trace.candidates.map((c) => `${c.ruleId} (spec ${c.score})`).join(", ");
  const effects = trace.effects.length ? trace.effects.join(", ") : "—";
  const vivo = trace.vivos.length
    ? trace.vivos.map((v) => `${v.id} → ${v.ruleId ?? "—"}`).join(", ")
    : "—";
  return [
    command,
    `regra: ${trace.ruleId ?? "nenhuma"}`,
    `candidatos: [${cands}]`,
    `efeitos: ${effects}`,
    `vivo: ${vivo}`,
  ].join("\n");
}
