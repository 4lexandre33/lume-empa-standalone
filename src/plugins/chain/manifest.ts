/**
 * Chain Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const CHAIN_MANIFEST: IPluginManifest = {
  name: "lume-chain",
  version: "1.0.0",
  description: "THEN chains interact on an existing id. Same matcher. Does not spawn events or run a second engine.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Chain", version: "1.0.0" }],
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
