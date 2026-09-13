/**
 * Knowledge Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KNOWLEDGE_MANIFEST: IPluginManifest = {
  name: "lume-knowledge",
  version: "1.0.0",
  description: "Agent cognition store (KNOW). Distinct from INFORMATION entities.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Knowledge", version: "1.0.0" }],
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
    events: ["lume:knowledge-updated"],
  },
};
