/**
 * Lume Knowledge Plugin
 * UPDATE KNOWLEDGE in DO. INFORMATION entities stay in the world model.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { KnowledgeUpdatedEvent } from "../../core/contracts/typed-event.ts";
import type { EffectContext, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import type { EffectOp } from "../narrative-engine/lib/rule-engine.ts";
import { KNOWLEDGE_MANIFEST } from "./manifest.ts";
import { factsFor, knows, remember } from "./lib/store.ts";
import type { KnowledgeService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/store.ts";

export class KnowledgePlugin implements IPlugin {
  manifest: IPluginManifest = KNOWLEDGE_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: KnowledgeService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      remember,
      knows,
      factsFor,
    };
  }

  private handleKnow(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    const agentId = op.args[0];
    const factId = op.args[1];
    if (!agentId || !factId) return ctx.game;
    const next = remember(ctx.game, agentId, factId);
    void this.context.emitEvent(new KnowledgeUpdatedEvent({ agentId, factId }));
    return next;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Knowledge Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregister = effects.register("know", (ctx, op) => this.handleKnow(ctx, op));
    this.context.registerCapability({
      name: "Knowledge",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Knowledge Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume Knowledge Plugin deactivated.");
  }

  getService(): KnowledgeService {
    return this.service;
  }
}

export function createKnowledgePlugin(context: PluginContext): IPlugin {
  return new KnowledgePlugin(context);
}
