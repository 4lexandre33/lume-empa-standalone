/**
 * Prose Kit Plugin Manifest — presentation. Not a generator.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KIT_PROSE_MANIFEST: IPluginManifest = {
  name: "lume-kit-prose",
  version: "1.0.0",
  description: "Voice, FUNCAO, recap. Reads history. Does not match. Not Curveship.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Prose", version: "1.0.0" }],
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
