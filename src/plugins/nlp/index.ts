/**
 * Lume NLP Plugin
 * Phrase → intent.*. Last in the pipeline. Fail-closed. Does not match ON/IF.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { IntentEngineService } from "../intent-engine/types.ts";
import { NLP_MANIFEST } from "./manifest.ts";
import { interpret, splitPhrases } from "./lib/nlp.ts";
import type { NlpService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/nlp.ts";

export class NlpPlugin implements IPlugin {
  manifest: IPluginManifest = NLP_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: NlpService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = { interpret, splitPhrases };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume NLP Plugin...");
    const intent = this.context.getService<IntentEngineService>("IntentEngine");
    this.unregister = intent.registerPhraseMapper((text, game) => interpret(text, game.worldModel));
    this.context.registerCapability({
      name: "Nlp",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume NLP Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume NLP Plugin deactivated.");
  }

  getService(): NlpService {
    return this.service;
  }
}

export function createNlpPlugin(context: PluginContext): IPlugin {
  return new NlpPlugin(context);
}
