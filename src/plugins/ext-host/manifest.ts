/**
 * External Plugin Host — first-party. Guests never register on the kernel.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const EXT_HOST_MANIFEST: IPluginManifest = {
  name: "lume-ext-host",
  version: "1.0.0",
  description: "Sandbox for ext-* plugins and deterministic AI plugin kit generated from the live kernel.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "ExtHost", version: "1.0.0" }],
  },

  requires: {
    optional: [
      { name: "NarrativeEngine", version: "1.0.0" },
      { name: "IntentEngine", version: "1.0.0" },
      { name: "IdeState", version: "1.0.0" },
      { name: "RuleEffects", version: "1.0.0" },
      { name: "RuleSemantics", version: "1.0.0" },
    ],
  },

  hooks: {
    init: async () => {},
    destroy: async () => {},
  },

  permissions: {
    storage: "write",
    network: "none",
    events: ["lume:ext-plugin", "lume:game-beat", "lume:world-event", "lume:knowledge-updated", "lume:intent-dispatched"],
  },
};
