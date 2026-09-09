/**
 * IDE Guide & Onboarding Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const IDE_GUIDE_MANIFEST: IPluginManifest = {
  name: 'lume-ide-guide',
  version: '1.0.0',
  description: 'Interactive tutorials, onboarding walkthroughs, syntax references and educational guides for Lume DSL',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'IdeGuide', version: '1.0.0' }
    ]
  },

  permissions: {
    storage: 'read',
    network: 'none'
  }
};
