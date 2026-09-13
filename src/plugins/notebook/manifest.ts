/**
 * Notebook Plugin Manifest — human caderno source. Not a matcher.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const NOTEBOOK_MANIFEST: IPluginManifest = {
  name: "lume-notebook",
  version: "1.0.0",
  description: "Caderno humano. compileNotebook is empty until C2. Does not match ON/IF.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "Notebook", version: "1.0.0" }],
  },

  requires: {
    mandatory: [],
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
