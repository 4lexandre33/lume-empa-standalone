/**
 * Rule Semantics Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const RULE_SEMANTICS_MANIFEST: IPluginManifest = {
  name: "lume-rule-semantics",
  version: "1.0.0",
  description: "Classifies narrative rules into semantic kinds without changing match or execution.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "RuleSemantics", version: "1.0.0" }],
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
  },
};
