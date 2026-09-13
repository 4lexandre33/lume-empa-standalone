import {
  entityDescription,
  entityDisplayName,
  queryGameView,
  type GameState,
} from "../../narrative-engine/lib/runtime.ts";
import { matchSift } from "../../narrative-engine/lib/sift.ts";
import { emptyBeat } from "../../narrative-engine/lib/beat.ts";
import type { Intent, IntentResolution, ScopeFn } from "../types.ts";

export type KnowledgeFact = {
  id: string;
  kind: string;
  label: string;
  note: string;
};

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function nameOf(game: GameState, id: string): string {
  return entityDisplayName(game.worldModel, id);
}

function leafOf(intent: Intent): string {
  return intent.operation[intent.operation.length - 1] ?? "";
}

/** Entity ids committed to memory by prior PERCEIVE/COGNIZE beats. */
export function knownIdsFromHistory(game: GameState): string[] {
  const ids: string[] = [];
  for (const beat of game.history) {
    const parts = beat.triggerId.split(".");
    if (parts[0] !== "perceive" && parts[0] !== "cognize") continue;
    for (const part of parts.slice(2)) {
      if (part && part !== "local" && game.worldModel.has(part)) ids.push(part);
    }
  }
  return unique(ids);
}

export function knowledgeFromHistory(game: GameState): KnowledgeFact[] {
  return knownIdsFromHistory(game).map((id) => {
    const entity = game.worldModel.get(id);
    return {
      id,
      kind: "known",
      label: nameOf(game, id),
      note: entityDescription(game.worldModel, id) || nameOf(game, id),
    };
  });
}

function factNote(game: GameState, id: string): string {
  const desc = entityDescription(game.worldModel, id);
  const entity = game.worldModel.get(id);
  if (entity?.tags.has("sleeping")) return `${nameOf(game, id)} está adormecido.`;
  if (desc) return desc;
  return nameOf(game, id);
}

function narrator(game: GameState, actor: string): string {
  if (actor === game.playerEntityId) return "Você";
  return nameOf(game, actor);
}

function presentObserveLocal(game: GameState, actor: string, scope?: ScopeFn): { story: string; seen: string[] } {
  const who = narrator(game, actor);
  const sensed = scope?.(game.worldModel, actor);
  if (sensed) {
    const loc = sensed.place;
    const locName = loc ? nameOf(game, loc) : "lugar nenhum";
    const locDesc = loc && sensed.lit ? entityDescription(game.worldModel, loc) : "";
    const inventory = new Set(sensed.inventory);
    const here = sensed.see.filter((id) => id !== loc && !inventory.has(id));
    const names = here.map((id) => nameOf(game, id));
    if (!sensed.lit) {
      return { story: `${who} não vê nada. Está escuro.`, seen: [...sensed.see] };
    }
    const seen = [...(loc ? [loc] : []), ...here];
    let story = `${who} observa ${locName}.`;
    if (locDesc) story += ` ${locDesc}`;
    if (names.length) story += ` Também vê: ${names.join(", ")}.`;
    else story += " Nada mais chama atenção.";
    return { story, seen };
  }
  const view = queryGameView(game, actor);
  const loc = view.currentLocation;
  const locName = loc ? nameOf(game, loc) : "lugar nenhum";
  const locDesc = loc ? entityDescription(game.worldModel, loc) : "";
  const here = [...view.itemsHere, ...view.charsHere];
  const names = here.map((id) => nameOf(game, id));
  const seen = [...(loc ? [loc] : []), ...here];
  let story = `${who} observa ${locName}.`;
  if (locDesc) story += ` ${locDesc}`;
  if (names.length) story += ` Também vê: ${names.join(", ")}.`;
  else story += " Nada mais chama atenção.";
  return { story, seen };
}

function presentPerceive(game: GameState, intent: Intent, args: Record<string, string>, actor: string, scope?: ScopeFn): { story: string; seen: string[] } {
  const op = leafOf(intent);
  const target = args.target;
  const who = narrator(game, actor);
  if (op === "observe" && (!target || target === "local")) return presentObserveLocal(game, actor, scope);
  if (op === "observe" && target) {
    return { story: `${who} observa ${nameOf(game, target)}. ${factNote(game, target)}`, seen: [target] };
  }
  if (op === "inspect" && target) {
    const desc = entityDescription(game.worldModel, target);
    const story = desc
      ? `${who} inspeciona ${nameOf(game, target)}. ${desc}`
      : `${who} inspeciona ${nameOf(game, target)}.`;
    return { story, seen: [target] };
  }
  if (op === "locate" && target) {
    const loc = game.worldModel.get(target)?.links.current_location;
    const story = loc
      ? `${who} localiza ${nameOf(game, target)}: está em ${nameOf(game, loc)}.`
      : `${who} não sabe onde ${nameOf(game, target)} está.`;
    return { story, seen: [target] };
  }
  if (op === "listen") {
    if (target) return { story: `${who} escuta ${nameOf(game, target)}.`, seen: [target] };
    const sensed = scope?.(game.worldModel, actor);
    if (sensed) {
      const sleeper = sensed.hear.find((id) => game.worldModel.get(id)?.tags.has("sleeping"));
      if (sleeper) return { story: `${who} escuta o entorno. Um ronco vem de ${nameOf(game, sleeper)}.`, seen: [sleeper] };
      return { story: `${who} escuta o entorno. Silêncio.`, seen: [] };
    }
    const view = queryGameView(game, actor);
    const sleeper = view.charsHere.find((id) => game.worldModel.get(id)?.tags.has("sleeping"));
    if (sleeper) return { story: `${who} escuta o entorno. Um ronco vem de ${nameOf(game, sleeper)}.`, seen: [sleeper] };
    return { story: `${who} escuta o entorno. Silêncio.`, seen: [] };
  }
  return { story: `${who} percebe o entorno.`, seen: [] };
}

function presentCognize(game: GameState, intent: Intent, args: Record<string, string>, actor: string): { story: string; seen: string[] } {
  const op = leafOf(intent);
  const target = args.target;
  const who = narrator(game, actor);
  if (op === "evaluate" && target) {
    return { story: `${who} avalia ${nameOf(game, target)}. ${factNote(game, target)}`, seen: [target] };
  }
  if (op === "remember" && target) {
    const known = knownIdsFromHistory(game).includes(target);
    const story = known
      ? `${who} se lembra de ${nameOf(game, target)}. ${factNote(game, target)}`
      : `${who} guarda ${nameOf(game, target)} na memória.`;
    return { story, seen: [target] };
  }
  if (op === "compare") {
    const a = args.a;
    const b = args.b;
    if (a && b) {
      return {
        story: `${who} compara ${nameOf(game, a)} e ${nameOf(game, b)}.`,
        seen: [a, b],
      };
    }
  }
  if (op === "decide") {
    const option = args.option ?? "";
    return { story: option ? `${who} decide: ${option}.` : `${who} decide.`, seen: [] };
  }
  return { story: `${who} pensa.`, seen: [] };
}

function triggerIdOf(intent: Intent, args: Record<string, string>, seen: string[]): string {
  const family = intent.family ?? "perceive";
  const parts = [family, ...intent.operation];
  if (family === "perceive" && leafOf(intent) === "observe" && (!args.target || args.target === "local")) {
    parts.push("local", ...seen);
  } else {
    const values = intent.family === "cognize" && leafOf(intent) === "compare"
      ? [args.a, args.b]
      : [args.target ?? args.option];
    for (const value of values) if (value) parts.push(value);
    for (const id of seen) if (!parts.includes(id)) parts.push(id);
  }
  return parts.join(".");
}

/**
 * Applies a VALID PERCEIVE/COGNIZE intent as a presentation beat.
 * Does not call interact() and does not change tags, stats or links.
 */
export function presentIntent(resolution: IntentResolution, game: GameState, scope?: ScopeFn): { game: GameState; triggerId: string } {
  const intent = resolution.intent;
  const args = resolution.resolvedArgs ?? intent.args;
  const actor = intent.actor || game.playerEntityId;
  const presented =
    intent.family === "cognize"
      ? presentCognize(game, intent, args, actor)
      : presentPerceive(game, intent, args, actor, scope);
  const triggerId = triggerIdOf(intent, args, presented.seen);
  const beat = {
    triggerId,
    ruleId: null,
    story: presented.story,
    timestamp: Date.now(),
    cycleIndex: 0,
  };
  const history = [...game.history, beat];
  return {
    triggerId,
    game: {
      ...game,
      story: presented.story,
      lastInteractionId: triggerId,
      lastRule: null,
      lastCandidates: [],
      history,
      sifted: matchSift(history, game.patterns ?? []),
      lastBeat: emptyBeat(triggerId),
    },
  };
}
