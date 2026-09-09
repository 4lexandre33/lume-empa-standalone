import { parseNarrative, renderMarkdown, humanizeEntityId } from "./narrative.ts";
import { query } from "./query.ts";
import { applyChanges, findMatchingRule, findMatchingRules, type Rule, type RuleMatch } from "./rule-engine.ts";
import { EMPTY_TAXONOMY, type CompiledTaxonomy } from "./taxonomy.ts";
import type { WorldModel } from "./types.ts";
import { cloneWorldModel, getLink } from "./world-model.ts";

export type GameBeat = { triggerId: string; ruleId: string | null; story: string; timestamp: number; cycleIndex: number };
export type GameState = {
  worldModel: WorldModel;
  initialWorld: WorldModel;
  rules: readonly Rule[];
  taxonomy: CompiledTaxonomy;
  playerEntityId: string;
  story: string;
  ruleCounts: Record<string, number>;
  lastInteractionId: string | null;
  lastRule: Rule | null;
  lastCandidates: RuleMatch[];
  history: GameBeat[];
};
export type GameView = {
  currentLocation: string | null;
  inventory: string[];
  locations: string[];
  itemsHere: string[];
  charsHere: string[];
};

export function entityDisplayName(world: WorldModel, id: string): string {
  return world.get(id)?.extra?.name || humanizeEntityId(id);
}
export function entityDescription(world: WorldModel, id: string): string {
  return world.get(id)?.extra?.description ?? "";
}

export function createGame(
  worldModel: WorldModel,
  rules: readonly Rule[],
  playerEntityId = "JOGADOR",
  taxonomy: CompiledTaxonomy = EMPTY_TAXONOMY,
): GameState {
  return {
    worldModel: cloneWorldModel(worldModel),
    initialWorld: cloneWorldModel(worldModel),
    rules,
    taxonomy,
    playerEntityId,
    story: "",
    ruleCounts: {},
    lastInteractionId: null,
    lastRule: null,
    lastCandidates: [],
    history: [],
  };
}

export function interactWith(state: GameState, triggerId: string): GameState {
  const world = state.worldModel;
  const tax = state.taxonomy;
  const candidates = findMatchingRules(triggerId, state.rules, world, tax);
  const rule = findMatchingRule(triggerId, state.rules, world, tax);
  const key = rule?.id ?? triggerId;
  const cycleIndex = state.ruleCounts[key] ?? 0;
  let nextWorld = world;
  let story = "";
  if (rule) {
    nextWorld = applyChanges(world, rule.changes, triggerId);
    story = parseNarrative(rule.narrative, { worldModel: nextWorld, triggerId, cycleIndex });
  } else {
    story = parseNarrative(entityDescription(world, triggerId) || `{${triggerId}.name}`, {
      worldModel: world,
      triggerId,
      cycleIndex,
    });
  }
  const beat: GameBeat = { triggerId, ruleId: rule?.id ?? null, story, timestamp: Date.now(), cycleIndex };
  return {
    ...state,
    worldModel: nextWorld,
    story,
    lastInteractionId: triggerId,
    lastRule: rule,
    lastCandidates: candidates,
    ruleCounts: { ...state.ruleCounts, [key]: cycleIndex + 1 },
    history: [...state.history, beat],
  };
}

export function bootGame(state: GameState): GameState {
  if (state.worldModel.has("start") || state.rules.some((r) => r.trigger.source.replace(/\s/g, "") === "start" || (r.trigger.selector.kind === "id" && r.trigger.selector.id === "start"))) {
    return interactWith(state, "start");
  }
  return state;
}

export function resetGame(state: GameState): GameState {
  return bootGame({
    ...state,
    worldModel: cloneWorldModel(state.initialWorld),
    story: "",
    ruleCounts: {},
    lastInteractionId: null,
    lastRule: null,
    lastCandidates: [],
    history: [],
  });
}

export function rewindTo(state: GameState, index: number): GameState {
  if (index < 0) return resetGame(state);
  const keep = Math.min(index, state.history.length - 1);
  if (keep < 0) return resetGame(state);
  if (keep === state.history.length - 1) return state;
  let next = createGame(state.initialWorld, state.rules, state.playerEntityId, state.taxonomy);
  for (let i = 0; i <= keep; i++) {
    const id = state.history[i]?.triggerId;
    if (id) next = interactWith(next, id);
  }
  return next;
}

export function queryGameView(state: GameState): GameView {
  const { worldModel, playerEntityId, taxonomy } = state;
  const currentLocation = getLink(worldModel, playerEntityId, "current_location");
  const q = (m: string) => query(m, worldModel, playerEntityId, taxonomy).map(([id]) => id);
  const inventory = q(`*.object.!hidden.current_location=${playerEntityId}`);
  const locations = q(`*.place.!hidden`).filter((id) => id !== currentLocation);
  const itemsHere = q(`*.object.!hidden.current_location=(link ${playerEntityId}.current_location)`);
  const charsHere = q(`*.agent.!hidden.current_location=(link ${playerEntityId}.current_location)`).filter((id) => id !== playerEntityId);
  const more = ["event", "information", "abstract"].flatMap((tag) =>
    q(`*.${tag}.!hidden.current_location=(link ${playerEntityId}.current_location)`),
  );
  return { currentLocation, inventory, locations, itemsHere, charsHere: [...charsHere, ...more] };
}

export function listChoiceGroups(state: GameState): { title: string; ids: string[] }[] {
  const view = queryGameView(state);
  return [
    { title: "Lugar", ids: view.currentLocation ? [view.currentLocation] : [] },
    { title: "Saídas", ids: view.locations },
    { title: "Aqui", ids: [...view.itemsHere, ...view.charsHere] },
    { title: "Inventário", ids: view.inventory },
  ].filter((g) => g.ids.length > 0);
}

export { renderMarkdown };