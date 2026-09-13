/**
 * Lume Combat Kit — taxonomy + ON/IF/DO. Does not match; does not mutate the kernel.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { COMBAT_TAGS } from "./data/combat.ts";
import { KIT_COMBAT_MANIFEST } from "./manifest.ts";
import { COMBAT_RULES, COMBAT_TAXONOMY, applyCombatKit, kitApplied } from "./lib/kit.ts";
import type { CombatKitService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/kit.ts";
export * from "./data/combat.ts";

export class KitCombatPlugin implements IPlugin {
  manifest: IPluginManifest = KIT_COMBAT_MANIFEST;
  context: PluginContext;
  private service: CombatKitService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "combat",
      taxonomySource: COMBAT_TAXONOMY,
      rulesSource: COMBAT_RULES,
      tags: COMBAT_TAGS,
      applied: kitApplied,
      apply: applyCombatKit,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Combat Kit...");
    this.context.registerCapability({
      name: "CombatKit",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Combat Kit activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Combat Kit deactivated.");
  }

  getService(): CombatKitService {
    return this.service;
  }
}

export function createKitCombatPlugin(context: PluginContext): IPlugin {
  return new KitCombatPlugin(context);
}
