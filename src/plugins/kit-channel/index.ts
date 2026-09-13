/**
 * Lume Channel Kit — taxonomy + ON/IF/DO. Does not match; does not mutate the kernel.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { CHANNEL_KINDS } from "./data/channels.ts";
import { KIT_CHANNEL_MANIFEST } from "./manifest.ts";
import { CHANNEL_RULES, CHANNEL_TAXONOMY, applyChannelKit, kitApplied } from "./lib/kit.ts";
import type { ChannelKitService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/kit.ts";
export * from "./data/channels.ts";

export class KitChannelPlugin implements IPlugin {
  manifest: IPluginManifest = KIT_CHANNEL_MANIFEST;
  context: PluginContext;
  private service: ChannelKitService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "channel",
      taxonomySource: CHANNEL_TAXONOMY,
      rulesSource: CHANNEL_RULES,
      kinds: CHANNEL_KINDS,
      applied: kitApplied,
      apply: applyChannelKit,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Channel Kit...");
    this.context.registerCapability({
      name: "ChannelKit",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Channel Kit activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Channel Kit deactivated.");
  }

  getService(): ChannelKitService {
    return this.service;
  }
}

export function createKitChannelPlugin(context: PluginContext): IPlugin {
  return new KitChannelPlugin(context);
}
