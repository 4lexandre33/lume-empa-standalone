import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_SETTINGS_MANIFEST, createIdeSettingsPlugin } from '../../index.ts';
import type { IdeSettingsPluginService } from '../../types.ts';
import { DEFAULT_IDE_SETTINGS } from '../../../project-cloud/lib/persistence.ts';

describe('IDE Settings Plugin', () => {
  let core: Core;
  let settingsService: IdeSettingsPluginService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_SETTINGS_MANIFEST, createIdeSettingsPlugin);

    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-settings');
    settingsService = core.getService<IdeSettingsPluginService>('IdeSettingsService');
  });

  it('declares valid manifest', () => {
    assert.equal(IDE_SETTINGS_MANIFEST.name, 'lume-ide-settings');
    assert.equal(IDE_SETTINGS_MANIFEST.version, '1.0.0');
    assert.ok(IDE_SETTINGS_MANIFEST.capabilities?.provides?.some((c) => c.name === 'IdeSettingsService'));
  });

  it('provides comprehensive settings management and persistence', async () => {
    const defaults = settingsService.getDefaults();
    assert.deepEqual(defaults, DEFAULT_IDE_SETTINGS);

    const initial = await settingsService.getSettings();
    assert.ok(initial);

    const updated = await settingsService.updateSettings({
      locale: 'en',
      onboarding: 'done',
      layout: { left: 25, right: 30, bottom: 25 }
    });

    assert.equal(updated.locale, 'en');
    assert.equal(updated.onboarding, 'done');
    assert.deepEqual(updated.layout, { left: 25, right: 30, bottom: 25 });

    const reset = await settingsService.resetToDefaults();
    assert.equal(reset.locale, 'pt');
  });
});
