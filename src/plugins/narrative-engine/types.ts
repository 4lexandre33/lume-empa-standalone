/**
 * Narrative Engine Plugin Capability Interfaces & Contracts
 */

export type {
  Project,
  CompileProjectResult,
  GameState,
  GameBeat,
  GameView,
  WorldModel,
  Entity,
  EntityId,
  Rule,
  Issue,
  CompiledTaxonomy,
  TaxonomyNode,
  TagImpact,
  TagMatchExplain,
  TagMatchMode,
  CompletionItem,
  CompletionContext,
  HighlightSpan,
  SourceKind,
  MatcherAST,
  MatcherExplain,
  Vocabulary,
  ExampleMeta,
  ProjectIndexEntry,
  WireProject
} from './lib/index.ts';

import type {
  Project,
  CompileProjectResult,
  GameState,
  GameView,
  WorldModel,
  Entity,
  Rule,
  Issue,
  CompiledTaxonomy,
  TaxonomyNode,
  TagImpact,
  TagMatchExplain,
  TagMatchMode,
  CompletionItem,
  CompletionContext,
  HighlightSpan,
  SourceKind,
  MatcherAST,
  MatcherExplain,
  Vocabulary,
  ExampleMeta
} from './lib/index.ts';

export interface NarrativeEngineService {
  compileProject(project: Project): CompileProjectResult;
  compileProjectAsync(project: Project): Promise<CompileProjectResult>;
  createGame(
    worldModel: WorldModel,
    rules: readonly Rule[],
    playerEntityId?: string,
    taxonomy?: CompiledTaxonomy
  ): GameState;
  createGameAsync(
    worldModel: WorldModel,
    rules: readonly Rule[],
    playerEntityId?: string,
    taxonomy?: CompiledTaxonomy
  ): Promise<GameState>;
  interact(state: GameState, triggerId: string): GameState;
  interactAsync(state: GameState, triggerId: string): Promise<GameState>;
  rewindTo(state: GameState, index: number): GameState;
  bootGame(state: GameState): GameState;
  resetGame(state: GameState): GameState;
  queryGameView(state: GameState): GameView;
  listChoiceGroups(state: GameState): { title: string; ids: string[] }[];
  diagnose(project: Project): { compiled: CompileProjectResult; issues: Issue[] };
  createProject(
    name: string,
    seed?: Partial<Pick<Project, "entitiesSource" | "taxonomySource" | "rulesSource" | "extras" | "settings">> & { id?: string }
  ): Project;
  cloneProject(project: Project): Project;
  fingerprintProject(project: Project): string;
  getExampleCatalog(): ExampleMeta[];
  blankEntities: string;
  blankRules: string;
  blankTaxonomy: string;
}

export interface TaxonomyService {
  compileTaxonomy(source: string): CompiledTaxonomy;
  taxonomyForest(taxonomy?: CompiledTaxonomy | null): TaxonomyNode[];
  ancestors(tag: string, taxonomy?: CompiledTaxonomy | null): string[];
  inheritedTags(entity: Entity, taxonomy?: CompiledTaxonomy | null): string[];
  effectiveTags(direct: Iterable<string>, taxonomy?: CompiledTaxonomy | null): Set<string>;
  matchesTag(
    entity: Entity,
    tag: string,
    taxonomy?: CompiledTaxonomy | null,
    mode?: TagMatchMode
  ): boolean;
  explainTagMatch(entity: Entity, tag: string, taxonomy?: CompiledTaxonomy | null): TagMatchExplain;
  impactOfTag(
    tag: string,
    world: WorldModel,
    rules: readonly { id: string; startLine: number; trigger: MatcherAST; conditions: MatcherAST[] }[],
    taxonomy?: CompiledTaxonomy | null
  ): TagImpact;
  depthOf(tag: string, taxonomy?: CompiledTaxonomy | null): number;
}

export interface QueryEngineService {
  query(
    matcher: string | MatcherAST,
    world: WorldModel,
    triggerId?: string,
    taxonomy?: CompiledTaxonomy | null,
    mode?: TagMatchMode
  ): [string, ...unknown[]][];
  parseMatcher(source: string, options?: { file?: string; startLine?: number }): MatcherAST;
  matchesEntity(
    ast: MatcherAST,
    entityId: string,
    world: WorldModel,
    triggerId?: string,
    taxonomy?: CompiledTaxonomy | null,
    mode?: TagMatchMode
  ): boolean;
  explainMatcher(
    ast: MatcherAST,
    entityId: string,
    world: WorldModel,
    triggerId?: string,
    taxonomy?: CompiledTaxonomy | null,
    mode?: TagMatchMode
  ): MatcherExplain;
  queryHasResults(
    matcher: string | MatcherAST,
    world: WorldModel,
    triggerId?: string,
    taxonomy?: CompiledTaxonomy | null,
    mode?: TagMatchMode
  ): boolean;
}

export interface LanguageToolsService {
  highlightSource(source: string, kind: SourceKind): HighlightSpan[][];
  completeAt(
    source: string,
    kind: SourceKind,
    offset: number,
    vocab: Vocabulary
  ): { ctx: CompletionContext; items: CompletionItem[] };
  collectVocabulary(options: {
    worldModel?: WorldModel;
    extras?: Record<string, Record<string, string>>;
    taxonomy?: CompiledTaxonomy | null;
    taxonomySource?: string;
  }): Vocabulary;
  analyzeCompletion(source: string, kind: SourceKind, offset: number): CompletionContext;
}
