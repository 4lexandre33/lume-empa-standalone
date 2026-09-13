/**
 * Life Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const LIFE_MANIFEST: IPluginManifest = {
  name: "lume-life",
  version: "1.0.0",
  description: "LIVE lets vivo agents react in the same beat via interact. Same matcher. Opt-in. Does not tick the clock.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Life", version: "1.0.0" }],
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
    events: [],
  },
};
