/**
 * Combat Kit Plugin Manifest — data only.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KIT_COMBAT_MANIFEST: IPluginManifest = {
  name: "lume-kit-combat",
  version: "1.0.0",
  description: "Generic combat data: hp, force, hostile, mortal, dead. Attack fallback. Not an engine.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "CombatKit", version: "1.0.0" }],
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
