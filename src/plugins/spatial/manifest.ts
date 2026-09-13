/**
 * Spatial Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const SPATIAL_MANIFEST: IPluginManifest = {
  name: "lume-spatial",
  version: "1.0.0",
  description: "Containment and travel queries. Does not match ON/IF and does not mutate the world.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Spatial", version: "1.0.0" }],
  },

  requires: {
    mandatory: [{ name: "NarrativeEngine", version: "1.0.0" }],
  },

  hooks: {
    init: async () => {},
    destroy: async () => {},
  },

  permissions: {
    storage: "none",
    network: "none",
    events: [],
  },
};
