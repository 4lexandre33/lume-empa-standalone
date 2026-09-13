/**
 * Lume Rule Semantics Plugin
 * Classification only — never participates in findMatchingRule or applyChanges.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { RULE_SEMANTICS_MANIFEST } from "./manifest.ts";
import { ruleSemanticsService } from "./lib/classify.ts";
import type { RuleSemanticsService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/classify.ts";

export class RuleSemanticsPlugin implements IPlugin {
  manifest: IPluginManifest = RULE_SEMANTICS_MANIFEST;
  context: PluginContext;
  private service: RuleSemanticsService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = ruleSemanticsService;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Rule Semantics Plugin...");
    this.context.registerCapability({
      name: "RuleSemantics",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Rule Semantics Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Rule Semantics Plugin deactivated.");
  }

  getService(): RuleSemanticsService {
    return this.service;
  }
}

export function createRuleSemanticsPlugin(context: PluginContext): IPlugin {
  return new RuleSemanticsPlugin(context);
}
