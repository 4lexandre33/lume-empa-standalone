import { queryHasResults } from "./query.ts";
import type { WorldModel } from "./types.ts";

export const DEFAULT_PROP_KEYWORD_NAMES = ["name", "description"] as const;

const extraKeywords: Record<string, (id: string, world: WorldModel) => string> = {};

export function humanizeEntityId(id: string): string {
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function registerPropKeyword(name: string, fn: (id: string, world: WorldModel) => string) {
  extraKeywords[name] = fn;
}
export function getPropKeywords(): Record<string, (id: string, world: WorldModel) => string> {
  return { ...extraKeywords };
}
export function resetPropKeywords() {
  for (const k of Object.keys(extraKeywords)) delete extraKeywords[k];
}

function propOf(id: string, key: string, world: WorldModel): string {
  if (extraKeywords[key]) return extraKeywords[key]!(id, world);
  const extra = world.get(id)?.extra?.[key];
  if (extra) return extra;
  if (key === "name") return humanizeEntityId(id);
  if (key === "description") return world.get(id)?.extra?.description ?? "";
  return "";
}

export function voiceOf(world: WorldModel, triggerId: string, playerId?: string): string {
  const raw =
    world.get(triggerId)?.extra?.voice ??
    (playerId ? world.get(playerId)?.extra?.voice : undefined) ??
    world.get("NARRADOR")?.extra?.voice ??
    "";
  return raw.trim().toLowerCase();
}

export function pickNarrative(
  narrative: string,
  voices: Record<string, string> | undefined,
  world: WorldModel,
  triggerId: string,
  playerId?: string,
): string {
  const voice = voiceOf(world, triggerId, playerId);
  if (voice && voices?.[voice]) return voices[voice]!;
  return narrative;
}

export type NarrativeCtx = {
  worldModel: WorldModel;
  triggerId: string;
  cycleIndex: number;
};

export function parseNarrative(template: string, ctx: NarrativeCtx): string {
  if (!template) return "";
  return template.replace(/\{([^}]*)\}/g, (_, inner: string) => {
    const raw = inner.trim();
    const qIndex = raw.indexOf("?");
    if (qIndex !== -1) {
      const query = raw.slice(0, qIndex).trim();
      const rest = raw.slice(qIndex + 1);
      const bar = rest.indexOf("|");
      const ifTrue = (bar >= 0 ? rest.slice(0, bar) : rest).trim();
      const ifFalse = (bar >= 0 ? rest.slice(bar + 1) : "").trim();
      try {
        return queryHasResults(query, ctx.worldModel, ctx.triggerId) ? ifTrue : ifFalse;
      } catch {
        return ifFalse;
      }
    }
    // Cycle even when the options contain periods (prose).
    if (raw.includes("|")) {
      const options = raw.split("|").map((s) => s.trim());
      return options[Math.min(ctx.cycleIndex, options.length - 1)] ?? "";
    }
    const dot = raw.indexOf(".");
    if (dot >= 0) {
      let id = raw.slice(0, dot).trim();
      const key = raw.slice(dot + 1).trim();
      if (id === "$") id = ctx.triggerId;
      return propOf(id, key, ctx.worldModel);
    }
    return raw;
  });
}

export function renderMarkdown(text: string): string {
  const esc = text.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  return esc
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}
