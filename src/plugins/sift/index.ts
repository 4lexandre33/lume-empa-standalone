/**
 * Lume Sift — PADRAO over history. Does not match ON/IF; does not mutate the world.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { GameBeatGeneratedEvent, StorySiftedEvent } from "../../core/contracts/typed-event.ts";
import type { GameState } from "../narrative-engine/lib/runtime.ts";
import { bannerOf, matchSift, parsePadrao } from "../narrative-engine/lib/sift.ts";
import { SIFT_MANIFEST } from "./manifest.ts";
import type { SiftService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/sift.ts";

export class SiftPlugin implements IPlugin {
  manifest: IPluginManifest = SIFT_MANIFEST;
  context: PluginContext;
  private unbind: (() => void) | null = null;
  private service: SiftService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      id: "sift",
      parse: parsePadrao,
      match: matchSift,
      banner: bannerOf,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Sift...");
    this.unbind = this.context.on(GameBeatGeneratedEvent, (event) => {
      const game = event.data.gameState as unknown as GameState;
      const hits = game.sifted ?? [];
      const prev = matchSift((game.history ?? []).slice(0, -1), game.patterns ?? []);
      for (const hit of hits) {
        if (prev.some((old) => old.id === hit.id)) continue;
        void this.context.emitEvent(
          new StorySiftedEvent({
            projectId: event.data.projectId,
            patternId: hit.id,
            name: hit.name,
            hits: hits.map((item) => ({ id: item.id, name: item.name, at: item.at })),
          }),
        );
      }
    });
    this.context.registerCapability({
      name: "Sift",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Sift activated.");
  }

  async deactivate(): Promise<void> {
    this.unbind?.();
    this.unbind = null;
    this.context.logger.info("Lume Sift deactivated.");
  }

  getService(): SiftService {
    return this.service;
  }
}

export function createSiftPlugin(context: PluginContext): IPlugin {
  return new SiftPlugin(context);
}
