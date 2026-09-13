/**
 * Lume Spatial Plugin
 * Containment (in/on/held_by/worn_by) and travel (exit_*, connector). Read-only.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import { SPATIAL_MANIFEST } from "./manifest.ts";
import { graphOf, placeOf } from "./lib/map.ts";
import {
  chain,
  connectorsFrom,
  contents,
  contentsOn,
  deepContains,
  destination,
  exits,
  heldBy,
  inOf,
  locationOf,
  occupants,
  relationOf,
  wornBy,
} from "./lib/space.ts";
import type { SpatialService } from "./types.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export * from "./lib/space.ts";
export * from "./lib/map.ts";

export class SpatialPlugin implements IPlugin {
  manifest: IPluginManifest = SPATIAL_MANIFEST;
  context: PluginContext;
  private service: SpatialService;

  constructor(context: PluginContext) {
    this.context = context;
    this.service = {
      inOf,
      locationOf,
      relationOf,
      contents,
      contentsOn,
      heldBy,
      wornBy,
      occupants,
      chain,
      deepContains,
      exits,
      connectorsFrom,
      destination,
      graphOf,
      placeOf,
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume Spatial Plugin...");
    this.context.registerCapability({
      name: "Spatial",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    this.context.logger.info("Lume Spatial Plugin activated.");
  }

  async deactivate(): Promise<void> {
    this.context.logger.info("Lume Spatial Plugin deactivated.");
  }

  getService(): SpatialService {
    return this.service;
  }
}

export function createSpatialPlugin(context: PluginContext): IPlugin {
  return new SpatialPlugin(context);
}
