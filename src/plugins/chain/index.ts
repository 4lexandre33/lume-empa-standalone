/**
 * Lume Chain Plugin
 * THEN in DO. Same interactWith. Does not spawn, does not match ON/IF itself.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { EffectContext, EffectOp, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import { CHAIN_MANIFEST } from "./manifest.ts";
import { follow, resolveThenId } from "./lib/chain.ts";
import type { ChainService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/chain.ts";

export class ChainPlugin implements IPlugin {
  manifest: IPluginManifest = CHAIN_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: ChainService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = { follow };
  }

  private handleThen(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    const id = resolveThenId(op.args[0], ctx.triggerId);
    if (!id) return ctx.game;
    return follow(ctx.game, id, ctx.interact);
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Chain Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregister = effects.register("then", (ctx, op) => this.handleThen(ctx, op));
    this.context.registerCapability({
      name: "Chain",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Chain Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume Chain Plugin deactivated.");
  }

  getService(): ChainService {
    return this.service;
  }
}

export function createChainPlugin(context: PluginContext): IPlugin {
  return new ChainPlugin(context);
}
