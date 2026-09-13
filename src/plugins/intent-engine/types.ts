/**
 * Intent Engine — public contracts (Phase 8: player / button / npc / script share the same Intent)
 */

import type { GameState } from "../narrative-engine/types.ts";

export type { GameState };

export type IntentSource = "player" | "button" | "npc" | "script";
export type IntentStatus = "incomplete" | "complete" | "invalid";
export type IntentFamily = "perceive" | "cognize" | "action";
export type CatalogKind = "root" | "family" | "operation";
export type IntentArgType = "entity" | "scope" | "option";
export type SuggestionKind = "family" | "operation" | "argument" | "scope";
export type IntentResolveStatus =
  | "VALID"
  | "INVALID"
  | "UNKNOWN"
  | "INCOMPLETE"
  | "AMBIGUOUS"
  | "TARGET_UNAVAILABLE";

export type IntentParseErrorCode =
  | "UNKNOWN_ROOT"
  | "UNKNOWN_TOKEN"
  | "UNEXPECTED_ARGUMENT"
  | "EMPTY_SEGMENT"
  | "INVALID_SYNTAX";

export type IntentParseError = {
  code: IntentParseErrorCode;
  message: string;
  token?: string;
};

export type IntentArgumentDef = {
  name: string;
  type: IntentArgType;
  required: boolean;
};

export type Intent = {
  source: IntentSource;
  raw: string;
  status: IntentStatus;
  family?: IntentFamily;
  operation: string[];
  args: Record<string, string>;
  actor: string;
  partialToken?: string;
  error?: IntentParseError;
};

export type ParseIntentOptions = {
  source?: IntentSource;
  actor?: string;
  scope?: ScopeFn;
};

export type ScopeSnapshot = {
  place: string | null;
  see: string[];
  hear: string[];
  touch: string[];
  inventory: string[];
  lit: boolean;
};

export type ScopeFn = (world: GameState["worldModel"], observerId: string) => ScopeSnapshot;

export type CatalogNode = {
  token: string;
  path: string;
  kind: CatalogKind;
  label: string;
  description: string;
  arguments: IntentArgumentDef[];
  childTokens: string[];
};

export type IntentSuggestion = {
  token: string;
  path: string;
  kind: SuggestionKind;
  label: string;
  description?: string;
  argName?: string;
  valid: boolean;
};

export type IntentResolution = {
  status: IntentResolveStatus;
  intent: Intent;
  suggestions: IntentSuggestion[];
  resolvedArgs?: Record<string, string>;
  message?: string;
};

export type IntentExecution = {
  resolution: IntentResolution;
  game: GameState;
  executed: boolean;
  triggerId?: string;
  dryRun?: boolean;
};

export interface IntentCatalogService {
  getRoot(): CatalogNode;
  getNode(path: string): CatalogNode | null;
  getChildren(path: string): CatalogNode[];
  getSignature(path: string): IntentArgumentDef[];
}

export type IntentEngineService = {
  parse(text: string, options?: ParseIntentOptions): Intent;
  getCatalog(): IntentCatalogService;
  suggest(text: string, game: GameState, options?: ParseIntentOptions): IntentSuggestion[];
  resolve(text: string, game: GameState, options?: ParseIntentOptions): IntentResolution;
  execute(text: string, game: GameState, options?: ParseIntentOptions): IntentExecution;
  commandFromChoice(game: GameState, entityId: string): string | null;
  applySuggestion(text: string, token: string): string;
  registerPhraseMapper(mapper: PhraseMapper): () => void;
};

export type PhraseHit = { command: string; dryRun: boolean };
export type PhraseMapper = (text: string, game: GameState) => PhraseHit | null;
