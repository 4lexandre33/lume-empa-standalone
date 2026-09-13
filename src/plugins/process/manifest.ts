/**
 * Process Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const PROCESS_MANIFEST: IPluginManifest = {
  name: "lume-process",
  version: "1.0.0",
  description: "WAIT/TICK process effects. Cycle remaining lives on process entities. No wall clock.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Process", version: "1.0.0" }],
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
