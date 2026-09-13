/**
 * Lume Senses Plugin
 * Derived can_see / can_hear / can_touch. Never writes those links.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { SENSES_MANIFEST } from "./manifest.ts";
import { bindSenses } from "./lib/senses.ts";
import type { SenseSpatial, SensesService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/senses.ts";

export class SensesPlugin implements IPlugin {
  manifest: IPluginManifest = SENSES_MANIFEST;
  context: PluginContext;
  private service: SensesService | null = null;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Senses Plugin...");
    const spatial = this.context.getService<SenseSpatial>("Spatial");
    this.service = bindSenses(spatial);
    this.context.registerCapability({
      name: "Senses",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Senses Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.service = null;
    this.context.logger.info("Lume Senses Plugin deactivated.");
  }

  getService(): SensesService {
    if (!this.service) throw new Error("Senses not active");
    return this.service;
  }
}

export function createSensesPlugin(context: PluginContext): IPlugin {
  return new SensesPlugin(context);
}
