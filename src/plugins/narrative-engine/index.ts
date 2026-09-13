/**
 * Narrative Engine Plugin — Implementation
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import {
  ProjectCompiledEvent,
  GameCreatedEvent,
  GameBeatGeneratedEvent,
  GameErrorEvent
} from '../../core/contracts/typed-event.ts';

import { NARRATIVE_ENGINE_MANIFEST } from './manifest.ts';
import type {
  NarrativeEngineService,
  TaxonomyService,
  QueryEngineService,
  LanguageToolsService
} from './types.ts';

import * as engine from './lib/index.ts';

export * from './manifest.ts';
export * from './types.ts';
export * from './lib/index.ts';

export class NarrativeEnginePlugin implements IPlugin {
  manifest: IPluginManifest = NARRATIVE_ENGINE_MANIFEST;
  context: PluginContext;

  private narrativeEngineService: NarrativeEngineService;
  private taxonomyService: TaxonomyService;
  private queryEngineService: QueryEngineService;
  private languageToolsService: LanguageToolsService;

  constructor(context: PluginContext) {
    this.context = context;

    // Build Taxonomy Service
    this.taxonomyService = {
      compileTaxonomy: (source) => engine.compileTaxonomy(source),
      taxonomyForest: (taxonomy) => engine.taxonomyForest(taxonomy),
      ancestors: (tag, taxonomy) => {
        if (!taxonomy) return [];
        return taxonomy.ancestors.get(tag) ?? [];
      },
      inheritedTags: (entity, taxonomy) => engine.inheritedTags(entity, taxonomy),
      effectiveTags: (direct, taxonomy) => engine.effectiveTags(direct, taxonomy),
      matchesTag: (entity, tag, taxonomy, mode) => engine.matchesTag(entity, tag, taxonomy, mode),
      explainTagMatch: (entity, tag, taxonomy) => engine.explainTagMatch(entity, tag, taxonomy),
      impactOfTag: (tag, world, rules, taxonomy) => engine.impactOfTag(tag, world, rules as any, taxonomy),
      depthOf: (tag, taxonomy) => engine.depthOf(tag, taxonomy)
    };

    // Build Query Engine Service
    this.queryEngineService = {
      query: (matcher, world, triggerId, taxonomy, mode) => {
        return engine.query(matcher, world, triggerId, taxonomy, mode);
      },
      parseMatcher: (source, options) => {
        return engine.parseMatcher(source, options);
      },
      matchesEntity: (ast, entityId, world, triggerId, taxonomy, mode) => {
        return engine.matchesEntity(ast, entityId, world, triggerId ?? '', taxonomy, mode);
      },
      explainMatcher: (ast, entityId, world, triggerId, taxonomy, mode) => {
        return engine.explainMatcher(ast, entityId, world, triggerId ?? '', taxonomy, mode);
      },
      queryHasResults: (matcher, world, triggerId, taxonomy, mode) => {
        return engine.queryHasResults(matcher, world, triggerId ?? '', taxonomy, mode);
      }
    };

    // Build Language Tools Service
    this.languageToolsService = {
      highlightSource: (source, kind) => {
        return engine.highlightSource(source, kind);
      },
      completeAt: (source, kind, offset, vocab) => {
        return engine.completeAt(source, kind, offset, vocab);
      },
      collectVocabulary: (options) => {
        return engine.collectVocabulary(options);
      },
      analyzeCompletion: (source, kind, offset) => {
        return engine.analyzeCompletion(source, kind, offset);
      }
    };

    // Build Narrative Engine Service
    this.narrativeEngineService = {
      compileProject: (project) => {
        return engine.compileProject(project);
      },

      compileProjectAsync: async (project) => {
        const start = Date.now();
        try {
          const result = engine.compileProject(project);
          const durationMs = Date.now() - start;

          await this.context.emitEvent(
            new ProjectCompiledEvent({
              projectId: project.meta?.id ?? (project as any).id ?? '',
              result: {
                ok: result.errors.length === 0,
                worldModel: result.worldModel as any,
                rules: result.rules as any,
                issues: [...result.errors, ...result.warnings] as any,
                durationMs
              },
              durationMs
            })
          );

          return result;
        } catch (err: any) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: project.meta?.id ?? (project as any).id ?? '',
              error: err?.message || String(err),
              context: { operation: 'compileProject' }
            })
          );
          throw err;
        }
      },

      createGame: (worldModel, rules, playerEntityId, taxonomy, patterns, options) => {
        return engine.createGame(worldModel, rules, playerEntityId, taxonomy, patterns, options);
      },

      createGameAsync: async (worldModel, rules, playerEntityId, taxonomy, patterns, options) => {
        try {
          const gameState = engine.createGame(worldModel, rules, playerEntityId, taxonomy, patterns, options);
          await this.context.emitEvent(
            new GameCreatedEvent({
              projectId: playerEntityId ?? 'default',
              gameState: gameState as any
            })
          );
          return gameState;
        } catch (err: any) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: playerEntityId || 'unknown',
              error: err?.message || String(err),
              context: { operation: 'createGame' }
            })
          );
          throw err;
        }
      },

      interact: (state, triggerId) => {
        return engine.interactWith(state, triggerId);
      },

      interactAsync: async (state, triggerId) => {
        try {
          const nextState = engine.interactWith(state, triggerId);
          const beat = nextState.history[nextState.history.length - 1];

          if (beat) {
            await this.context.emitEvent(
              new GameBeatGeneratedEvent({
                projectId: state.playerEntityId ?? '',
                turn: nextState.history.length,
                beat: {
                  turn: nextState.history.length,
                  triggeredBy: beat.triggerId,
                  narrative: beat.story,
                  changes: {},
                  timestamp: beat.timestamp
                },
                gameState: nextState as any
              })
            );
          }

          return nextState;
        } catch (err: any) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: state.playerEntityId ?? '',
              error: err?.message || String(err),
              context: { operation: 'interact', triggerId }
            })
          );
          throw err;
        }
      },

      dryRun: (state, triggerId) => engine.dryRunWith(state, triggerId),
      diffWorlds: (before, after) => engine.diffWorlds(before, after),

      rewindTo: (state, index) => engine.rewindTo(state, index),
      bootGame: (state) => engine.bootGame(state),
      resetGame: (state) => engine.resetGame(state),
      queryGameView: (state) => engine.queryGameView(state),
      listChoiceGroups: (state) => engine.listChoiceGroups(state),
      diagnose: (project) => engine.diagnose(project),
      createProject: (name, seed) => engine.createProject(name, seed),
      cloneProject: (project) => engine.cloneProject(project),
      fingerprintProject: (project) => engine.fingerprintProject(project),
      getExampleCatalog: () => engine.EXAMPLE_CATALOG,
      blankEntities: engine.BLANK_ENTITIES,
      blankRules: engine.BLANK_RULES,
      blankTaxonomy: engine.BLANK_TAXONOMY
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume Narrative Engine Plugin...');

    // 1. Register NarrativeEngine capability
    this.context.registerCapability({
      name: 'NarrativeEngine',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.narrativeEngineService as any
    });

    // 2. Register Taxonomy capability
    this.context.registerCapability({
      name: 'Taxonomy',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.taxonomyService as any
    });

    // 3. Register QueryEngine capability
    this.context.registerCapability({
      name: 'QueryEngine',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.queryEngineService as any
    });

    // 4. Register LanguageTools capability
    this.context.registerCapability({
      name: 'LanguageTools',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.languageToolsService as any
    });

    // 5. Register RuleEffects capability (DO verb handlers from domain plugins)
    this.context.registerCapability({
      name: 'RuleEffects',
      version: '1.0.0',
      provider: this.manifest.name,
      api: engine.ruleEffectsService as any
    });

    // Run init hook if defined
    if (this.manifest.hooks?.init) {
      await this.manifest.hooks.init();
    }

    this.context.logger.info('Lume Narrative Engine Plugin activated successfully with 5 capabilities.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Deactivating Lume Narrative Engine Plugin...');
    if (this.manifest.hooks?.destroy) {
      await this.manifest.hooks.destroy();
    }
    this.context.logger.info('Lume Narrative Engine Plugin deactivated.');
  }

  getNarrativeEngine(): NarrativeEngineService {
    return this.narrativeEngineService;
  }

  getTaxonomy(): TaxonomyService {
    return this.taxonomyService;
  }

  getQueryEngine(): QueryEngineService {
    return this.queryEngineService;
  }

  getLanguageTools(): LanguageToolsService {
    return this.languageToolsService;
  }
}

export function createNarrativeEnginePlugin(context: PluginContext): IPlugin {
  return new NarrativeEnginePlugin(context);
}
