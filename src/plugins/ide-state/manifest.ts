/**
 * IDE State & Orchestration Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const IDE_STATE_MANIFEST: IPluginManifest = {
  name: 'lume-ide-state',
  version: '1.0.0',
  description: 'Zustand-based IDE state manager, reactive compiler orchestrator and UI coordination engine',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'IdeState', version: '1.0.0' },
      { name: 'IdeStore', version: '1.0.0' }
    ]
  },

  requires: {
    mandatory: [
      { name: 'NarrativeEngine', version: '1.0.0' },
      { name: 'ProjectCloud', version: '1.0.0' }
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
      'lume:project-compiled',
      'lume:game-created',
      'lume:game-beat',
      'lume:project-saved',
      'lume:project-loaded',
      'lume:user-edited-source',
      'lume:user-clicked-play',
      'lume:user-clicked-rewind',
      'lume:game-error'
    ]
  }
};
