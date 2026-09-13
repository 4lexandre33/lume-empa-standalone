/**
 * Dry-run Plugin Manifest
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const DRY_RUN_MANIFEST: IPluginManifest = {
  name: "lume-dry-run",
  version: "1.0.0",
  description: "Hypothetical interact: same matcher, cloned DO, live world untouched. Does not run EMIT/KNOW/INTENT.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "DryRun", version: "1.0.0" }],
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
