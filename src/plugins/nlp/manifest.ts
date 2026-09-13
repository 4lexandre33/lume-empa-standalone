/**
 * NLP Plugin Manifest — optional phrase → intent.*. Last, fail-closed.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const NLP_MANIFEST: IPluginManifest = {
  name: "lume-nlp",
  version: "1.0.0",
  description: "Optional last-chance phrase mapper onto intent.*. Fail-closed. No embeddings.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Nlp", version: "1.0.0" }],
  },

  requires: {
    mandatory: [{ name: "IntentEngine", version: "1.0.0" }],
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
