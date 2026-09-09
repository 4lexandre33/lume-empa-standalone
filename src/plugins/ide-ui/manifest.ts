/**
 * IDE UI & Visual Components Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const IDE_UI_MANIFEST: IPluginManifest = {
  name: 'lume-ide-ui',
  version: '1.0.0',
  description: 'React UI components, layout views, panels, editor, preview and visual presentation layer for Lume IDE',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'IdeUI', version: '1.0.0' },
      { name: 'IdeComponents', version: '1.0.0' }
    ]
  },

  requires: {
    mandatory: [
      { name: 'NarrativeEngine', version: '1.0.0' },
      { name: 'ProjectCloud', version: '1.0.0' },
      { name: 'IdeStore', version: '1.0.0' }
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
    storage: 'read',
    network: 'none',
    events: [
      'lume:entity-interact',
      'lume:user-edited-source',
      'lume:user-clicked-play',
      'lume:user-clicked-rewind',
      'lume:project-compiled',
      'lume:game-created',
      'lume:game-beat',
      'lume:project-saved',
      'lume:project-loaded',
      'lume:game-error'
    ]
  }
};
