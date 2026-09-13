/**
 * Lume Intent Engine Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 *
 * Phase 8: the same Intent pipeline for player, button, npc and script sources.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { NarrativeEngineService, QueryEngineService } from "../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST } from "./manifest.ts";
import type {
  GameState,
  IntentCatalogService,
  IntentEngineService,
  ParseIntentOptions,
} from "./types.ts";
import {
  executeIntent,
  intentCatalog,
  parseIntent,
  resolveIntent,
  suggestIntent,
  commandFromChoice,
  applySuggestion,
  scopeFromHost,
  registerPhraseMapper,
  type QueryFn,
} from "./lib/index.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/index.ts";

export class IntentEnginePlugin implements IPlugin {
  manifest: IPluginManifest = INTENT_ENGINE_MANIFEST;
  context: PluginContext;

  private catalogService: IntentCatalogService;
  private engineService: IntentEngineService;

  constructor(context: PluginContext) {
    this.context = context;
    this.catalogService = intentCatalog;
    this.engineService = {
      parse: (text: string, options?: ParseIntentOptions) => parseIntent(text, options),
      getCatalog: () => this.catalogService,
      suggest: (text: string, game: GameState, options?: ParseIntentOptions) =>
        suggestIntent(text, game, this.queryFn(), this.withScope(options)),
      resolve: (text: string, game: GameState, options?: ParseIntentOptions) =>
        resolveIntent(text, game, this.queryFn(), this.withScope(options)),
      execute: (text: string, game: GameState, options?: ParseIntentOptions) => {
        const narrative = this.context.getService<NarrativeEngineService>("NarrativeEngine");
        return executeIntent(text, game, this.queryFn(), (state, triggerId) => narrative.interact(state, triggerId), this.withScope(options));
      },
      commandFromChoice: (game: GameState, entityId: string) => commandFromChoice(game, entityId),
      applySuggestion: (text: string, token: string) => applySuggestion(text, token),
      registerPhraseMapper,
    };
  }

  private withScope(options?: ParseIntentOptions): ParseIntentOptions {
    if (options?.scope) return options;
    let scope: ReturnType<typeof scopeFromHost>;
    try {
      const senses = this.context.getService<{ scope: NonNullable<ParseIntentOptions["scope"]> }>("Senses");
      scope = (world, observerId) => senses.scope(world, observerId);
    } catch {
      scope = scopeFromHost();
    }
    return { ...options, scope };
  }

  private queryFn(): QueryFn {
    const queryEngine = this.context.getService<QueryEngineService>("QueryEngine");
    return (matcher, world, triggerId, taxonomy) =>
      queryEngine.query(matcher, world, triggerId, taxonomy, "effective").map((row) => row[0]!);
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Intent Engine Plugin...");

    this.context.registerCapability({
      name: "IntentEngine",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.engineService as any,
    });

    this.context.registerCapability({
      name: "IntentCatalog",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.catalogService as any,
    });

    this.context.logger.info("Lume Intent Engine Plugin activated successfully.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Intent Engine Plugin deactivated.");
  }

  getEngineService(): IntentEngineService {
    return this.engineService;
  }

  getCatalogService(): IntentCatalogService {
    return this.catalogService;
  }
}

export function createIntentEnginePlugin(context: PluginContext): IPlugin {
  return new IntentEnginePlugin(context);
}
