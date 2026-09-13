/**
 * Intent Engine Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const INTENT_ENGINE_MANIFEST: IPluginManifest = {
  name: "lume-intent-engine",
  version: "1.0.0",
  description:
    "Command → Intent parser, catalog, resolver, rule adapter, choice mapping and CommandBar completion.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [
      { name: "IntentEngine", version: "1.0.0" },
      { name: "IntentCatalog", version: "1.0.0" },
    ],
  },

  requires: {
    mandatory: [
      { name: "NarrativeEngine", version: "1.0.0" },
      { name: "Taxonomy", version: "1.0.0" },
      { name: "QueryEngine", version: "1.0.0" },
    ],
    optional: [
      { name: "IdeState", version: "1.0.0" },
      { name: "Senses", version: "1.0.0" },
    ],
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
