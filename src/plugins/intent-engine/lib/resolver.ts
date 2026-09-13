import { findMatchingRule } from "../../narrative-engine/lib/rule-engine.ts";
import { cloneWorldModel } from "../../narrative-engine/lib/world-model.ts";
import type { CompiledTaxonomy, GameState, WorldModel } from "../../narrative-engine/types.ts";
import type {
  CatalogNode,
  Intent,
  IntentResolution,
  IntentResolveStatus,
  IntentSuggestion,
  ParseIntentOptions,
  SuggestionKind,
} from "../types.ts";
import { intentCatalog } from "./catalog.ts";
import { catalogPathFromIntent, lastCommandText, parseIntent } from "./parser.ts";
import { mapPhrase } from "./phrase.ts";
import { knownIdsFromHistory } from "./present.ts";

export type QueryFn = (
  matcher: string,
  world: WorldModel,
  triggerId?: string,
  taxonomy?: CompiledTaxonomy | null,
) => string[];

type WorldIndex = {
  loc: string | null;
  places: string[];
  objectsHere: string[];
  inventory: string[];
  agentsHere: string[];
  monstersHere: string[];
  openableHere: string[];
  containersHere: string[];
  visible: string[];
  hearable: string[];
  known: string[];
  topics: string[];
};

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function runQuery(query: QueryFn, matcher: string, game: GameState, actor: string): string[] {
  try {
    return unique(query(matcher, game.worldModel, actor, game.taxonomy ?? null));
  } catch {
    return [];
  }
}

function hereLink(actor: string): string {
  return `current_location=(link ${actor}.current_location)`;
}

function actingEntity(game: GameState, options: ParseIntentOptions): string {
  const actor = options.actor ?? game.playerEntityId;
  return game.worldModel.has(actor) ? actor : game.playerEntityId;
}

function buildIndex(game: GameState, query: QueryFn, actor: string, scope?: ParseIntentOptions["scope"]): WorldIndex {
  const loc = game.worldModel.get(actor)?.links.current_location ?? null;
  const here = hereLink(actor);
  const objectsHereQ = runQuery(query, `*.object.!hidden.${here}`, game, actor);
  const inventoryQ = runQuery(query, `*.object.!hidden.current_location=${actor}`, game, actor);
  const agentsHereQ = runQuery(query, `*.agent.!hidden.${here}`, game, actor).filter((id) => id !== actor);
  const monstersHereQ = runQuery(query, `*.monster.!hidden.${here}`, game, actor).filter((id) => id !== actor);
  const openableHereQ = runQuery(query, `*.openable.!hidden.${here}`, game, actor);
  const containersHereQ = runQuery(query, `*.container.!hidden.${here}`, game, actor);
  const extrasHereQ = ["event", "information", "abstract"].flatMap((tag) =>
    runQuery(query, `*.${tag}.!hidden.${here}`, game, actor),
  );
  const places = runQuery(query, `*.place.!hidden`, game, actor);
  const allObjects = runQuery(query, `*.object.!hidden`, game, actor);
  const allAgents = runQuery(query, `*.agent.!hidden`, game, actor).filter((id) => id !== actor);
  const allMonsters = runQuery(query, `*.monster.!hidden`, game, actor).filter((id) => id !== actor);
  const allOpenable = runQuery(query, `*.openable.!hidden`, game, actor);
  const allContainers = runQuery(query, `*.container.!hidden`, game, actor);
  const allExtras = ["event", "information", "abstract"].flatMap((tag) =>
    runQuery(query, `*.${tag}.!hidden`, game, actor),
  );
  const topicsQ = runQuery(query, `*.topic.!hidden`, game, actor);

  const sensed = scope?.(game.worldModel, actor);
  if (!sensed) {
    const visible = unique([...(loc ? [loc] : []), ...objectsHereQ, ...agentsHereQ, ...extrasHereQ, ...inventoryQ]);
    const known = unique([...knownIdsFromHistory(game), ...visible]).filter((id) => id !== actor);
    return {
      loc,
      places,
      objectsHere: objectsHereQ,
      inventory: inventoryQ,
      agentsHere: agentsHereQ,
      monstersHere: monstersHereQ,
      openableHere: openableHereQ,
      containersHere: containersHereQ,
      visible,
      hearable: visible,
      known,
      topics: unique([...topicsQ, ...known]),
    };
  }

  const inSee = (id: string) => sensed.see.includes(id);
  const inTouch = (id: string) => sensed.touch.includes(id);
  const inHear = (id: string) => sensed.hear.includes(id);
  const inventory = unique([...inventoryQ, ...allObjects.filter((id) => sensed.inventory.includes(id))]);
  const objectsHere = unique(allObjects.filter((id) => inTouch(id) && !inventory.includes(id)));
  const agentsHere = unique(allAgents.filter(inSee));
  const monstersHere = unique(allMonsters.filter((id) => inSee(id) || inTouch(id)));
  const openableHere = unique(allOpenable.filter(inTouch));
  const containersHere = unique(allContainers.filter(inTouch));
  const extrasHere = unique(allExtras.filter(inSee));
  const locId = sensed.place ?? loc;
  const visible = unique([...(locId ? [locId] : []), ...objectsHere, ...agentsHere, ...extrasHere, ...inventory].filter((id) => inSee(id) || inventory.includes(id)));
  const hearable = unique([...allObjects, ...allAgents, ...allMonsters, ...allExtras, ...(locId ? [locId] : [])].filter(inHear));
  const known = unique([...knownIdsFromHistory(game), ...visible, ...hearable]).filter((id) => id !== actor);
  return {
    loc: locId,
    places,
    objectsHere,
    inventory,
    agentsHere,
    monstersHere,
    openableHere,
    containersHere,
    visible,
    hearable,
    known,
    topics: unique([...topicsQ, ...known]),
  };
}

function displayName(world: WorldModel, id: string): string {
  const named = world.get(id)?.extra?.name;
  if (named) return named;
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function labelsFor(world: WorldModel, ids: string[]): Map<string, string> {
  const names = ids.map((id) => ({ id, name: displayName(world, id) }));
  const counts = new Map<string, number>();
  for (const row of names) counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  const out = new Map<string, string>();
  for (const row of names) {
    out.set(row.id, (counts.get(row.name) ?? 0) > 1 ? `${row.name} (${row.id})` : row.name);
  }
  return out;
}

function findEntityId(world: WorldModel, token: string): string | undefined {
  if (world.has(token)) return token;
  const lower = token.toLowerCase();
  for (const id of world.keys()) {
    if (id.toLowerCase() === lower) return id;
  }
  return undefined;
}

function entityIdsForArg(path: string, argName: string, args: Record<string, string>, index: WorldIndex): string[] {
  switch (path) {
    case "action.move":
    case "action.go":
      return argName === "destination" ? index.places.filter((id) => id !== index.loc) : [];
    case "action.interact.take":
      return argName === "target" ? index.objectsHere.filter((id) => !index.inventory.includes(id)) : [];
    case "action.interact.drop":
      return argName === "target" ? index.inventory : [];
    case "action.interact.put":
      if (argName === "object") return index.inventory;
      if (argName === "target") return index.containersHere.filter((id) => id !== args.object);
      return [];
    case "action.interact.give":
      if (argName === "object") return index.inventory;
      if (argName === "receiver") return index.agentsHere;
      return [];
    case "action.interact.open":
    case "action.interact.close":
    case "action.interact.lock":
    case "action.interact.unlock":
      return argName === "target" ? index.openableHere : [];
    case "action.interact.use":
      if (argName === "object") return index.inventory;
      if (argName === "target") return index.visible.filter((id) => id !== args.object);
      return [];
    case "action.interact.attack":
      return argName === "target" ? index.monstersHere : [];
    case "action.interact.talk":
    case "action.communicate":
      return argName === "target" ? index.agentsHere : [];
    case "action.interact.bye":
      return argName === "target" ? index.agentsHere : [];
    case "action.interact.ask":
    case "action.interact.tell":
      if (argName === "target") return index.agentsHere;
      if (argName === "topic") {
        return unique([...index.topics, ...index.known]).filter((id) => id !== args.target);
      }
      return [];
    case "perceive.observe":
    case "perceive.inspect":
    case "perceive.listen":
      return argName === "target" ? index.hearable : [];
    case "perceive.locate":
      return argName === "target" ? index.known : [];
    case "cognize.evaluate":
    case "cognize.remember":
      return argName === "target" ? index.known : [];
    case "cognize.compare":
      if (argName === "a") return index.known;
      if (argName === "b") return index.known.filter((id) => id.toLowerCase() !== (args.a ?? "").toLowerCase());
      return [];
    default:
      return [];
  }
}

function scopeTokensFor(path: string, argName: string): string[] {
  if (path === "perceive.observe" && argName === "target") return ["local"];
  return [];
}

function pickRuleTrigger(args: Record<string, string>, fallback: string): string {
  return args.destination ?? args.target ?? args.object ?? args.receiver ?? fallback;
}

function hasMatchingRule(
  game: GameState,
  actor: string,
  path: string,
  triggerId: string,
  args: Record<string, string>,
): boolean {
  if (!path.startsWith("action")) return true;
  const parts = path.split(".");
  const leaf = parts[parts.length - 1] ?? "";
  const family = parts[0] ?? "action";
  const world = cloneWorldModel(game.worldModel);
  const entity = world.get(actor);
  if (!entity) return false;
  entity.links.intent = leaf;
  entity.links.intent_family = family;
  for (const [name, value] of Object.entries(args)) {
    entity.links[`intent_${name}`] = value;
  }
  return findMatchingRule(triggerId, game.rules, world, game.taxonomy) != null;
}

function viableEntityIds(
  path: string,
  argName: string,
  args: Record<string, string>,
  index: WorldIndex,
  game: GameState,
  actor: string,
): string[] {
  const ids = entityIdsForArg(path, argName, args, index);
  if (!path.startsWith("action")) return ids;
  return ids.filter((id) => {
    const merged = { ...args, [argName]: id };
    return hasMatchingRule(game, actor, path, pickRuleTrigger(merged, id), merged);
  });
}

function operationAvailable(node: CatalogNode, index: WorldIndex, game: GameState, actor: string): boolean {
  if (node.childTokens.length > 0) {
    return intentCatalog.getChildren(node.path).some((child) => operationAvailable(child, index, game, actor));
  }
  const required = node.arguments.filter((arg) => arg.required);
  if (required.length === 0) return true;
  if (node.path === "cognize.compare") return index.known.length >= 2;
  return required.every((arg) => {
    if (arg.type === "option") return true;
    const scopes = scopeTokensFor(node.path, arg.name);
    if (scopes.length > 0) return true;
    return viableEntityIds(node.path, arg.name, {}, index, game, actor).length > 0;
  });
}

function matchesPrefix(token: string, label: string, prefix: string): boolean {
  if (!prefix) return true;
  const p = prefix.toLowerCase();
  return token.toLowerCase().startsWith(p) || label.toLowerCase().startsWith(p);
}

function argumentSuggestions(
  path: string,
  argName: string,
  prefix: string,
  args: Record<string, string>,
  game: GameState,
  index: WorldIndex,
  actor: string,
): IntentSuggestion[] {
  const scopes = scopeTokensFor(path, argName)
    .filter((token) => matchesPrefix(token, token, prefix))
    .map((token) => ({
      token,
      path,
      kind: "scope" as SuggestionKind,
      label: token.toUpperCase(),
      argName,
      valid: true,
    }));
  const ids = viableEntityIds(path, argName, args, index, game, actor);
  const labels = labelsFor(game.worldModel, ids);
  const entities = ids
    .filter((id) => matchesPrefix(id, labels.get(id) ?? id, prefix))
    .sort((a, b) => (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b, "pt"))
    .map((id) => ({
      token: id,
      path,
      kind: "argument" as SuggestionKind,
      label: labels.get(id) ?? id,
      description: game.worldModel.get(id)?.extra?.description,
      argName,
      valid: true,
    }));
  return [...scopes, ...entities];
}

function nextArgName(intent: Intent, node: CatalogNode): string | undefined {
  return node.arguments.find((arg) => intent.args[arg.name] == null)?.name;
}

function lastFilledArg(intent: Intent, node: CatalogNode): { name: string; value: string } | undefined {
  for (let i = node.arguments.length - 1; i >= 0; i--) {
    const def = node.arguments[i]!;
    const value = intent.args[def.name];
    if (value != null) return { name: def.name, value };
  }
  return undefined;
}

function exactCandidate(token: string, ids: string[], scopes: string[]): string | undefined {
  const lower = token.toLowerCase();
  const scope = scopes.find((s) => s.toLowerCase() === lower);
  if (scope) return scope;
  return ids.find((id) => id.toLowerCase() === lower);
}

function prefixCandidates(token: string, ids: string[], labels: Map<string, string>, scopes: string[]): string[] {
  return [
    ...scopes.filter((s) => matchesPrefix(s, s, token)),
    ...ids.filter((id) => matchesPrefix(id, labels.get(id) ?? id, token)),
  ];
}

/**
 * Contextual autocomplete. Catalog first, then world via Query + Taxonomy + rules.
 * Does not execute rules.
 */
export function suggestIntent(
  text: string,
  game: GameState,
  query: QueryFn,
  options: ParseIntentOptions = {},
): IntentSuggestion[] {
  const intent = parseIntent(lastCommandText(text), { ...options, actor: actingEntity(game, options) });
  if (intent.status === "invalid") return [];

  const index = buildIndex(game, query, intent.actor, options.scope);
  const path = catalogPathFromIntent(intent);
  const node = intentCatalog.getNode(path) ?? intentCatalog.getRoot();

  if (node.childTokens.length > 0) {
    const prefix = intent.partialToken ?? "";
    return intentCatalog
      .getChildren(path)
      .filter((child) => operationAvailable(child, index, game, intent.actor))
      .filter((child) => matchesPrefix(child.token, child.label, prefix))
      .map((child) => ({
        token: child.token,
        path: child.path,
        kind: (child.kind === "family" ? "family" : "operation") as SuggestionKind,
        label: child.label,
        description: child.description,
        valid: true,
      }));
  }

  const next = nextArgName(intent, node);
  if (next) {
    return argumentSuggestions(path, next, intent.partialToken ?? "", intent.args, game, index, intent.actor);
  }

  const last = lastFilledArg(intent, node);
  if (!last) return [];
  const ids = entityIdsForArg(path, last.name, intent.args, index);
  const scopes = scopeTokensFor(path, last.name);
  if (exactCandidate(last.value, ids, scopes)) return [];
  return argumentSuggestions(path, last.name, last.value, intent.args, game, index, intent.actor);
}

function parseStatusToResolve(intent: Intent): IntentResolveStatus {
  const code = intent.error?.code;
  if (code === "UNKNOWN_ROOT" || code === "UNKNOWN_TOKEN") return "UNKNOWN";
  return "INVALID";
}

function validateArg(
  path: string,
  argName: string,
  value: string,
  args: Record<string, string>,
  game: GameState,
  index: WorldIndex,
  actor: string,
): { status: IntentResolveStatus; canonical?: string; suggestions: IntentSuggestion[]; message?: string } {
  const def = intentCatalog.getSignature(path).find((a) => a.name === argName);
  if (def?.type === "option") {
    return { status: "VALID", canonical: value, suggestions: [] };
  }

  const ids = entityIdsForArg(path, argName, args, index);
  const scopes = scopeTokensFor(path, argName);
  const exact = exactCandidate(value, ids, scopes);
  if (exact) return { status: "VALID", canonical: exact, suggestions: [] };

  const labels = labelsFor(game.worldModel, ids);
  const prefixes = prefixCandidates(value, ids, labels, scopes);
  if (prefixes.length > 1) {
    return {
      status: "AMBIGUOUS",
      suggestions: argumentSuggestions(path, argName, value, args, game, index, actor),
      message: `alvo ambíguo: ${value}`,
    };
  }

  const known = findEntityId(game.worldModel, value);
  if (known) {
    return {
      status: "TARGET_UNAVAILABLE",
      suggestions: argumentSuggestions(path, argName, "", args, game, index, actor),
      message: `${known} não está disponível neste contexto.`,
    };
  }

  if (prefixes.length === 1) {
    return {
      status: "INCOMPLETE",
      suggestions: argumentSuggestions(path, argName, value, args, game, index, actor),
      message: "comando incompleto",
    };
  }

  return {
    status: "UNKNOWN",
    suggestions: argumentSuggestions(path, argName, "", args, game, index, actor),
    message: `entidade desconhecida: ${value}`,
  };
}

/**
 * Revalidates a parsed command against the current world.
 * Does not execute rules or mutate the world.
 */
export function resolveIntent(
  text: string,
  game: GameState,
  query: QueryFn,
  options: ParseIntentOptions = {},
): IntentResolution {
  const hit = mapPhrase(text, game);
  if (hit) text = hit.command;
  const intent = parseIntent(lastCommandText(text), { ...options, actor: actingEntity(game, options) });
  if (intent.status === "invalid") {
    return { status: parseStatusToResolve(intent), intent, suggestions: [], message: intent.error?.message };
  }
  if (intent.status === "incomplete") {
    return {
      status: "INCOMPLETE",
      intent,
      suggestions: suggestIntent(text, game, query, options),
      message: "comando incompleto",
    };
  }

  const path = catalogPathFromIntent(intent);
  const node = intentCatalog.getNode(path);
  if (!node) {
    return { status: "UNKNOWN", intent, suggestions: [], message: "intenção desconhecida" };
  }

  const index = buildIndex(game, query, intent.actor, options.scope);
  const resolvedArgs: Record<string, string> = {};
  for (const def of node.arguments) {
    const value = intent.args[def.name];
    if (value == null) {
      if (def.required) {
        return {
          status: "INCOMPLETE",
          intent,
          suggestions: argumentSuggestions(path, def.name, "", intent.args, game, index, intent.actor),
          message: "comando incompleto",
        };
      }
      continue;
    }
    const checked = validateArg(path, def.name, value, intent.args, game, index, intent.actor);
    if (checked.status !== "VALID") {
      return { status: checked.status, intent, suggestions: checked.suggestions, message: checked.message };
    }
    resolvedArgs[def.name] = checked.canonical ?? value;
  }

  return { status: "VALID", intent, suggestions: [], resolvedArgs };
}
