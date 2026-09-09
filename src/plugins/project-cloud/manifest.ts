/**
 * Project Cloud Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const PROJECT_CLOUD_MANIFEST: IPluginManifest = {
  name: 'lume-project-cloud',
  version: '1.0.0',
  description: 'Database persistence, playtest snapshots and history management for Lume projects',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'ProjectCloud', version: '1.0.0' },
      { name: 'ProjectHistory', version: '1.0.0' }
    ]
  },

  hooks: {
    init: async () => {
      // Initialization hook
    },
    destroy: async () => {
      // Teardown hook
    }
  },

  permissions: {
    storage: 'write',
    network: 'read',
    events: [
      'lume:project-saved',
      'lume:project-loaded',
      'lume:project-deleted',
      'lume:playtest-saved',
      'lume:playtest-loaded',
      'lume:game-error'
    ]
  }
};
