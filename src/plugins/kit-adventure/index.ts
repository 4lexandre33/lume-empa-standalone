/**
 * Lume Adventure Kit — taxonomy + ON/IF/DO. Does not match; does not mutate the kernel.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { KIT_ADVENTURE_MANIFEST } from "./manifest.ts";
import { ADVENTURE_RULES, ADVENTURE_TAXONOMY, applyAdventureKit, kitApplied } from "./lib/kit.ts";
import type { AdventureKitService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/kit.ts";

export class KitAdventurePlugin implements IPlugin {
  manifest: IPluginManifest = KIT_ADVENTURE_MANIFEST;
  context: PluginContext;
  private service: AdventureKitService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "adventure",
      taxonomySource: ADVENTURE_TAXONOMY,
      rulesSource: ADVENTURE_RULES,
      applied: kitApplied,
      apply: applyAdventureKit,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Adventure Kit...");
    this.context.registerCapability({
      name: "AdventureKit",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Adventure Kit activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Adventure Kit deactivated.");
  }

  getService(): AdventureKitService {
    return this.service;
  }
}

export function createKitAdventurePlugin(context: PluginContext): IPlugin {
  return new KitAdventurePlugin(context);
}
