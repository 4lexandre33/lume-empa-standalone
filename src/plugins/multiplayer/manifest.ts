/**
 * Multiplayer Collaboration Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const MULTIPLAYER_MANIFEST: IPluginManifest = {
  name: 'lume-multiplayer',
  version: '1.0.0',
  description: 'P2P WebRTC real-time multiplayer coordination and signaling for Lume storytelling sessions',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'Multiplayer', version: '1.0.0' }
    ]
  },

  permissions: {
    storage: 'read',
    network: 'read'
  }
};
