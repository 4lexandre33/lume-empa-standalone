import { SEMANTIC_KINDS, type Rule, type SemanticKind } from "../../narrative-engine/lib/rule-engine.ts";

const ORDER: SemanticKind[] = [...SEMANTIC_KINDS];

function unique(kinds: SemanticKind[]): SemanticKind[] {
  const seen = new Set<SemanticKind>();
  const out: SemanticKind[] = [];
  for (const kind of ORDER) {
    if (kinds.includes(kind) && !seen.has(kind)) {
      seen.add(kind);
      out.push(kind);
    }
  }
  return out;
}

function mentionsIntent(rule: Rule): boolean {
  if (rule.effects.some((effect) => effect.verb === "intent")) return true;
  const sources = [rule.trigger.source, ...rule.conditions.map((c) => c.source)];
  return sources.some((source) => /(^|[.\s])intent(=|\b)/i.test(source));
}

export function classifyRule(rule: Rule): SemanticKind[] {
  const kinds: SemanticKind[] = [...rule.semantics];
  const fields = rule.changes.flatMap((change) => change.fields);
  if (fields.some((field) => field.kind === "addTag" || field.kind === "removeTag" || field.kind === "setStat" || field.kind === "deltaStat" || field.kind === "deltaStatFrom" || field.kind === "mulStat")) {
    kinds.push("transformation");
  }
  if (fields.some((field) => field.kind === "setLink")) kinds.push("relation");
  if (fields.some((field) => field.kind === "createEntity" || field.kind === "destroyEntity")) kinds.push("lifecycle");
  if (rule.effects.some((effect) => effect.verb === "know")) kinds.push("cognition");
  if (rule.effects.some((effect) => effect.verb === "wait" || effect.verb === "tick")) kinds.push("process");
  if (mentionsIntent(rule)) kinds.push("agency");
  if (rule.conditions.length > 0) kinds.push("constraint");
  return unique(kinds);
}

export const ruleSemanticsService = {
  kinds: SEMANTIC_KINDS,
  classify: classifyRule,
};
