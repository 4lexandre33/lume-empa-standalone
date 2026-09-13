/**
 * Lume Prose Kit — FUNCAO list + recap. Does not match; does not mutate history.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { NARRATIVE_FUNCTIONS } from "./data/functions.ts";
import { recap } from "./lib/recap.ts";
import { KIT_PROSE_MANIFEST } from "./manifest.ts";
import type { ProseService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/recap.ts";
export * from "./data/functions.ts";

export class KitProsePlugin implements IPlugin {
  manifest: IPluginManifest = KIT_PROSE_MANIFEST;
  context: PluginContext;
  private service: ProseService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "prose",
      functions: NARRATIVE_FUNCTIONS,
      recap,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Prose Kit...");
    this.context.registerCapability({
      name: "Prose",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Prose Kit activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Prose Kit deactivated.");
  }

  getService(): ProseService {
    return this.service;
  }
}

export function createKitProsePlugin(context: PluginContext): IPlugin {
  return new KitProsePlugin(context);
}
