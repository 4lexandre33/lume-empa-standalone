/**
 * Senses Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const SENSES_MANIFEST: IPluginManifest = {
  name: "lume-senses",
  version: "1.0.0",
  description: "Derived see/hear/touch scope. Does not mutate the world or match ON/IF.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Senses", version: "1.0.0" }],
  },

  requires: {
    mandatory: [
      { name: "NarrativeEngine", version: "1.0.0" },
      { name: "Spatial", version: "1.0.0" },
    ],
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
