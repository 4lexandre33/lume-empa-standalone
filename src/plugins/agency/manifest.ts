/**
 * Agency Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const AGENCY_MANIFEST: IPluginManifest = {
  name: "lume-agency",
  version: "1.0.0",
  description: "CREATE INTENT from rules. Dispatches through IntentEngine (source: script).",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Agency", version: "1.0.0" }],
  },

  requires: {
    mandatory: [
      { name: "IntentEngine", version: "1.0.0" },
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
    events: ["lume:intent-dispatched"],
  },
};
