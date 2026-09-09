/**
 * Entity Extras Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const ENTITY_EXTRAS_MANIFEST: IPluginManifest = {
  name: 'lume-entity-extras',
  version: '1.0.0',
  description: 'Extended metadata, visual properties, display names and custom fields for world model entities',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'EntityExtras', version: '1.0.0' }
    ]
  },

  requires: {
    mandatory: [
      { name: 'NarrativeEngine', version: '1.0.0' }
    ]
  },

  permissions: {
    storage: 'read',
    network: 'none'
  }
};
