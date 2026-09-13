/**
 * Lume Life Plugin
 * LIVE in DO. Same interactWith. Opt-in reaction. Does not tick the clock.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { EffectContext, EffectOp, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import { LIFE_MANIFEST } from "./manifest.ts";
import { isVivo, listVivosHere, live } from "./lib/life.ts";
import { MAX_LIVE_PER_BEAT, VIVO_TAG, type LifeService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/life.ts";

export class LifePlugin implements IPlugin {
  manifest: IPluginManifest = LIFE_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: LifeService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      tag: VIVO_TAG,
      maxPerBeat: MAX_LIVE_PER_BEAT,
      isVivo,
      listHere: listVivosHere,
      live,
    };
  }

  private handleLive(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    return live(ctx.game, ctx.triggerId, ctx.interact, op.args[0]);
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Life Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregister = effects.register("live", (ctx, op) => this.handleLive(ctx, op));
    this.context.registerCapability({
      name: "Life",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Life Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume Life Plugin deactivated.");
  }

  getService(): LifeService {
    return this.service;
  }
}

export function createLifePlugin(context: PluginContext): IPlugin {
  return new LifePlugin(context);
}
