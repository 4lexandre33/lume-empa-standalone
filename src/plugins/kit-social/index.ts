/**
 * Lume Social Kit — taxonomy + ON/IF/DO. Does not match; does not mutate the kernel.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { RELATION_CATEGORIES } from "./data/relations.ts";
import { KIT_SOCIAL_MANIFEST } from "./manifest.ts";
import { SOCIAL_RULES, SOCIAL_TAXONOMY, applySocialKit, kitApplied } from "./lib/kit.ts";
import type { SocialKitService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/kit.ts";
export * from "./data/relations.ts";

export class KitSocialPlugin implements IPlugin {
  manifest: IPluginManifest = KIT_SOCIAL_MANIFEST;
  context: PluginContext;
  private service: SocialKitService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "social",
      taxonomySource: SOCIAL_TAXONOMY,
      rulesSource: SOCIAL_RULES,
      categories: RELATION_CATEGORIES,
      applied: kitApplied,
      apply: applySocialKit,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Social Kit...");
    this.context.registerCapability({
      name: "SocialKit",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Social Kit activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Social Kit deactivated.");
  }

  getService(): SocialKitService {
    return this.service;
  }
}

export function createKitSocialPlugin(context: PluginContext): IPlugin {
  return new KitSocialPlugin(context);
}
