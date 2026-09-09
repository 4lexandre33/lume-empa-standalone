/**
 * Narrative Engine Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const NARRATIVE_ENGINE_MANIFEST: IPluginManifest = {
  name: 'lume-narrative-engine',
  version: '1.0.0',
  description: 'Parser, compiler, runtime, taxonomy and query engine for Lume narrative DSL',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'NarrativeEngine', version: '1.0.0' },
      { name: 'Taxonomy', version: '1.0.0' },
      { name: 'QueryEngine', version: '1.0.0' },
      { name: 'LanguageTools', version: '1.0.0' }
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
      'lume:project-compiled',
      'lume:game-created',
      'lume:game-beat',
      'lume:game-error'
    ]
  }
};
