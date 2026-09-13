/**
 * Lume Dry-run Plugin
 * Hypothetical interact. Same matcher. Does not mutate the live world or run RuleEffects.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import type { NarrativeEngineService } from "../narrative-engine/types.ts";
import { DRY_RUN_MANIFEST } from "./manifest.ts";
import { bindDryRun } from "./lib/dry-run.ts";
import type { DryRunService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/dry-run.ts";

export class DryRunPlugin implements IPlugin {
  manifest: IPluginManifest = DRY_RUN_MANIFEST;
  context: PluginContext;
  private service: DryRunService | null = null;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Dry-run Plugin...");
    const narrative = this.context.getService<NarrativeEngineService>("NarrativeEngine");
    this.service = bindDryRun(narrative);
    this.context.registerCapability({
      name: "DryRun",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Dry-run Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.service = null;
    this.context.logger.info("Lume Dry-run Plugin deactivated.");
  }

  getService(): DryRunService {
    if (!this.service) throw new Error("DryRun not active");
    return this.service;
  }
}

export function createDryRunPlugin(context: PluginContext): IPlugin {
  return new DryRunPlugin(context);
}
