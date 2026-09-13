/**
 * Sift Plugin Manifest — named patterns over history. Not a second engine.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const SIFT_MANIFEST: IPluginManifest = {
  name: "lume-sift",
  version: "1.0.0",
  description: "PADRAO over history. Reconstructs hits. Emits lume:story-sifted. Not a matcher.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Sift", version: "1.0.0" }],
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
    events: ["lume:game-beat", "lume:story-sifted"],
  },
};
