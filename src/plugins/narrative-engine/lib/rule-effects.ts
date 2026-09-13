import type { EffectOp, Rule } from "./rule-engine.ts";

export const MAX_EFFECT_DEPTH = 4;

export type EffectContext<G = unknown> = {
  game: G;
  triggerId: string;
  rule: Rule;
  interact: (state: G, triggerId: string) => G;
};

export type EffectHandler<G = unknown> = (ctx: EffectContext<G>, op: EffectOp) => G;

const handlers = new Map<string, EffectHandler<any>>();

export function registerRuleEffect(verb: string, handler: EffectHandler<any>): () => void {
  const key = verb.trim().toLowerCase();
  handlers.set(key, handler);
  return () => {
    if (handlers.get(key) === handler) handlers.delete(key);
  };
}

export function clearRuleEffects(): void {
  handlers.clear();
}

export function getRuleEffect<G>(verb: string): EffectHandler<G> | undefined {
  return handlers.get(verb.trim().toLowerCase()) as EffectHandler<G> | undefined;
}

export function applyRuleEffects<G>(
  game: G,
  triggerId: string,
  rule: Rule,
  interact: (state: G, triggerId: string) => G,
): G {
  if (!rule.effects.length) return game;
  let current = game;
  for (const op of rule.effects) {
    const handler = getRuleEffect<G>(op.verb);
    if (!handler) continue;
    current = handler({ game: current, triggerId, rule, interact }, op);
  }
  return current;
}

export type RuleEffectsService = {
  register: typeof registerRuleEffect;
  apply: typeof applyRuleEffects;
  get: typeof getRuleEffect;
};

export const ruleEffectsService: RuleEffectsService = {
  register: registerRuleEffect,
  apply: applyRuleEffects,
  get: getRuleEffect,
};
