/**
 * World Events Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const WORLD_EVENTS_MANIFEST: IPluginManifest = {
  name: "lume-world-events",
  version: "1.0.0",
  description: "In-world EVENT trigger and EMIT effect for narrative rules.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "WorldEvents", version: "1.0.0" }],
  },

  requires: {
    mandatory: [
      { name: "NarrativeEngine", version: "1.0.0" },
      { name: "RuleEffects", version: "1.0.0" },
    ],
  },

  hooks: {
    init: async () => {},
    destroy: async () => {},
  },

  permissions: {
    storage: "none",
    network: "none",
    events: ["lume:world-event"],
  },
};
