/**
 * Lume Agency Plugin
 * Owns INTENT in DO. Does not select NPC actions on its own.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { IntentDispatchedEvent } from "../../core/contracts/typed-event.ts";
import type { EffectContext, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import type { EffectOp } from "../narrative-engine/lib/rule-engine.ts";
import type { IntentEngineService } from "../intent-engine/types.ts";
import { AGENCY_MANIFEST } from "./manifest.ts";
import { commandFromEffectArgs } from "./lib/command.ts";
import type { AgencyService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/command.ts";

export class AgencyPlugin implements IPlugin {
  manifest: IPluginManifest = AGENCY_MANIFEST;
  context: PluginContext;
  private unregister: (() => void) | null = null;
  private service: AgencyService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      commandFromEffect: commandFromEffectArgs,
      dispatch: (game, actorId, command) => this.dispatch(game, actorId, command),
    };
  }

  private dispatch(game: GameState, actorId: string, command: string): { game: GameState; executed: boolean } {
    const engine = this.context.getService<IntentEngineService>("IntentEngine");
    const result = engine.execute(command, game, { source: "script", actor: actorId });
    void this.context.emitEvent(
      new IntentDispatchedEvent({
        actorId,
        command,
        executed: result.executed,
      }),
    );
    return { game: result.game, executed: result.executed };
  }

  private handleIntent(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    const mapped = commandFromEffectArgs(op.args);
    if (!mapped) return ctx.game;
    return this.dispatch(ctx.game, mapped.actor, mapped.command).game;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Agency Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregister = effects.register("intent", (ctx, op) => this.handleIntent(ctx, op));
    this.context.registerCapability({
      name: "Agency",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Agency Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregister?.();
    this.unregister = null;
    this.context.logger.info("Lume Agency Plugin deactivated.");
  }

  getService(): AgencyService {
    return this.service;
  }
}

export function createAgencyPlugin(context: PluginContext): IPlugin {
  return new AgencyPlugin(context);
}
