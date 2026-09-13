/**
 * Lume World Events Plugin
 * Owns EMIT in DO. Does not match ON/IF.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { WorldEventOccurredEvent } from "../../core/contracts/typed-event.ts";
import type { EffectContext, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import type { EffectOp } from "../narrative-engine/lib/rule-engine.ts";
import { WORLD_EVENTS_MANIFEST } from "./manifest.ts";
import { ensureEventEntity } from "./lib/events.ts";
import type { WorldEventsService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/events.ts";

export class WorldEventsPlugin implements IPlugin {
  manifest: IPluginManifest = WORLD_EVENTS_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: WorldEventsService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      emit: (game, eventId) => ensureEventEntity(game, eventId),
    };
  }

  private handleEmit(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    const eventId = op.args[0];
    if (!eventId) return ctx.game;
    const withEntity = ensureEventEntity(ctx.game, eventId);
    void this.context.emitEvent(
      new WorldEventOccurredEvent({
        eventId,
        triggerId: ctx.triggerId,
        ruleId: ctx.rule.id,
      }),
    );
    return ctx.interact(withEntity, eventId);
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume World Events Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregister = effects.register("emit", (ctx, op) => this.handleEmit(ctx, op));
    this.context.registerCapability({
      name: "WorldEvents",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume World Events Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume World Events Plugin deactivated.");
  }

  getService(): WorldEventsService {
    return this.service;
  }
}

export function createWorldEventsPlugin(context: PluginContext): IPlugin {
  return new WorldEventsPlugin(context);
}
