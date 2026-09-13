/**
 * Channel Kit Plugin Manifest — data only.
 */

import type { IPluginManifest } from "../../core/contracts/plugin-manifest.ts";

export const KIT_CHANNEL_MANIFEST: IPluginManifest = {
  name: "lume-kit-channel",
  version: "1.0.0",
  description: "Global channel data: tag channel, stat state, economia|politica|facoes. Transitions. Not an engine.",
  author: "Lume Architecture Platform",

  capabilities: {
    provides: [{ name: "ChannelKit", version: "1.0.0" }],
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
