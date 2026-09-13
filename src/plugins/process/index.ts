/**
 * Lume Process Plugin
 * Owns WAIT and TICK in DO. Remaining lives on process entities. No wall clock.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { EffectContext, EffectOp, GameState, RuleEffectsService } from "../narrative-engine/types.ts";
import { PROCESS_MANIFEST } from "./manifest.ts";
import {
  dueProcesses,
  isProcess,
  listProcesses,
  remainingOf,
  schedule,
  tick,
} from "./lib/process.ts";
import { PROCESS_TAG, type ProcessService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/process.ts";

function turnsFromArgs(args: readonly string[]): number | null {
  const raw = args[0];
  if (raw === undefined) return null;
  const turns = Number(raw);
  return Number.isFinite(turns) ? turns : null;
}

export class ProcessPlugin implements IPlugin {
  manifest: IPluginManifest = PROCESS_MANIFEST;
  context: PluginContext;
  private unregisterWait: (() => void) | null = null;
  private unregisterTick: (() => void) | null = null;
  private service: ProcessService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      tag: PROCESS_TAG,
      isProcess,
      remaining: remainingOf,
      list: listProcesses,
      due: dueProcesses,
      schedule,
      tick,
    };
  }

  private handleWait(ctx: EffectContext<GameState>, op: EffectOp): GameState {
    const turns = turnsFromArgs(op.args);
    const id = op.args[1];
    if (turns === null || !id) return ctx.game;
    return schedule(ctx.game, id, turns);
  }

  private handleTick(ctx: EffectContext<GameState>, _op: EffectOp): GameState {
    return tick(ctx.game, ctx.interact);
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Process Plugin...");
    const effects = this.context.getService<RuleEffectsService>("RuleEffects");
    this.unregisterWait = effects.register("wait", (ctx, op) => this.handleWait(ctx, op));
    this.unregisterTick = effects.register("tick", (ctx, op) => this.handleTick(ctx, op));
    this.context.registerCapability({
      name: "Process",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Process Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.unregisterWait?.();
    this.unregisterTick?.();
    this.unregisterWait = null;
    this.unregisterTick = null;
    this.context.logger.info("Lume Process Plugin deactivated.");
  }

  getService(): ProcessService {
    return this.service;
  }
}

export function createProcessPlugin(context: PluginContext): IPlugin {
  return new ProcessPlugin(context);
}
