/**
 * IDE Settings & Preferences Plugin Manifest
 */

import type { IPluginManifest } from '../../core/contracts/plugin-manifest.ts';

export const IDE_SETTINGS_MANIFEST: IPluginManifest = {
  name: 'lume-ide-settings',
  version: '1.0.0',
  description: 'User workspace preferences, panel layout state, locale and onboarding flags management',
  author: 'Lume Architecture Platform',

  capabilities: {
    provides: [
      { name: 'IdeSettingsService', version: '1.0.0' }
    ]
  },

  requires: {
    optional: [
      { name: 'ProjectCloud', version: '1.0.0' }
    ]
  },

  permissions: {
    storage: 'write',
    network: 'read'
  }
};
