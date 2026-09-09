import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as persistence from '../../lib/persistence.ts';
import { createCore, Core } from '../../../../core/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../index.ts';
import type { ProjectCloudService, IdeSettings } from '../../types.ts';
import { createProject } from '../../../narrative-engine/lib/project.ts';

describe('Playtest Snapshots & Settings Parity', () => {
  let core: Core;
  let pluginCloud: ProjectCloudService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    await core.activatePlugin('lume-project-cloud');
    pluginCloud = core.getService<ProjectCloudService>('ProjectCloud');
  });

  it('maintains 100% parity across IDE settings load and save', async () => {
    const customSettings: IdeSettings = {
      locale: 'en',
      onboarding: 'done',
      layout: { left: 30, right: 35, bottom: 20 }
    };

    // Save settings via plugin
    await pluginCloud.saveSettings(customSettings);

    // Load settings via direct persistence vs plugin
    const directLoaded = await persistence.loadSettings();
    const pluginLoaded = await pluginCloud.loadSettings();

    assert.deepEqual(pluginLoaded, directLoaded);
    assert.equal(pluginLoaded.locale, 'en');
    assert.equal(pluginLoaded.onboarding, 'done');
    assert.deepEqual(pluginLoaded.layout, { left: 30, right: 35, bottom: 20 });
  });

  it('manages playtest snapshots reliably with persistence', async () => {
    const project = createProject('Playtest Snapshot Test');
    await pluginCloud.saveProject(project);

    const snapshotData = {
      turn: 3,
      history: [
        { triggerId: 'start', story: 'Beginning...' },
        { triggerId: 'CHEST', story: 'Opened chest.' }
      ]
    };

    const saveResult = await pluginCloud.savePlaytest(project.meta.id, snapshotData);
    assert.equal(saveResult.ok, true);

    const loadedSnapshot = await pluginCloud.loadPlaytest(project.meta.id);
    assert.ok(loadedSnapshot);
    assert.equal(loadedSnapshot.projectId, project.meta.id);
    assert.deepEqual(loadedSnapshot.snapshot, snapshotData);

    await pluginCloud.deletePlaytest(project.meta.id);
    const afterDelete = await pluginCloud.loadPlaytest(project.meta.id);
    assert.equal(afterDelete, null);

    await pluginCloud.deleteProject(project.meta.id);
  });
});
