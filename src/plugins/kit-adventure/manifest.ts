/**
 * Adventure Kit Plugin Manifest — data only.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KIT_ADVENTURE_MANIFEST: IPluginManifest = {
  name: "lume-kit-adventure",
  version: "1.0.0",
  description: "Generic adventure and conversation rules (take/drop/put/open/go + talk/ask/tell/bye). Data only.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "AdventureKit", version: "1.0.0" }],
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
