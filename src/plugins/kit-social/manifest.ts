/**
 * Social Kit Plugin Manifest — data only.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KIT_SOCIAL_MANIFEST: IPluginManifest = {
  name: "lume-kit-social",
  version: "1.0.0",
  description: "Generic social data: mood, relation, memory. Talk/attack fallbacks. Not an engine.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "SocialKit", version: "1.0.0" }],
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
