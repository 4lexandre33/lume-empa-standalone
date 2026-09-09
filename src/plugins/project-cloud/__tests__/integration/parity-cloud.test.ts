import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Persistence functions
import * as persistence from '../../lib/persistence.ts';

// EMPA Core & Plugin
import { createCore, Core } from '../../../../core/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../index.ts';
import type { ProjectCloudService } from '../../types.ts';
import { createProject } from '../../../narrative-engine/lib/project.ts';

describe('Project Cloud Parity (Persistence vs Plugin)', () => {
  let core: Core;
  let pluginCloud: ProjectCloudService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    await core.activatePlugin('lume-project-cloud');
    pluginCloud = core.getService<ProjectCloudService>('ProjectCloud');
  });

  it('maintains 100% parity across save, list, load and delete operations', async () => {
    const testProject = createProject('Parity Test Project', {
      entitiesSource: 'JOGADOR.{\ntags: agent;\nstats: hp=100;\nlinks: current_location=SALA;\n}\nSALA.{\ntags: place;\n}\nstart()\n',
      rulesSource: '# start\nON: start\nnarrativa: "Bem-vindo ao teste de paridade"\n',
      taxonomySource: 'goblin -> monster\nmonster -> agent'
    });

    // 1. Save via plugin
    const pluginSaved = await pluginCloud.saveProject(testProject);
    assert.equal(pluginSaved.id, testProject.meta.id);

    // 2. List via persistence vs plugin
    const directList = await persistence.listProjects();
    const pluginList = await pluginCloud.listProjects();

    assert.equal(pluginList.length, directList.length);
    const directItem = directList.find((p) => p.id === testProject.meta.id);
    const pluginItem = pluginList.find((p) => p.id === testProject.meta.id);

    assert.ok(directItem);
    assert.ok(pluginItem);
    assert.equal(pluginItem.id, directItem.id);
    assert.equal(pluginItem.name, directItem.name);

    // 3. Load via persistence vs plugin
    const directLoaded = await persistence.loadProject(testProject.meta.id);
    const pluginLoaded = await pluginCloud.loadProject(testProject.meta.id);

    assert.ok(directLoaded);
    assert.ok(pluginLoaded);
    assert.equal(pluginLoaded.meta.id, directLoaded.meta.id);
    assert.equal(pluginLoaded.meta.name, directLoaded.meta.name);
    assert.equal(pluginLoaded.entitiesSource, directLoaded.entitiesSource);
    assert.equal(pluginLoaded.rulesSource, directLoaded.rulesSource);
    assert.equal(pluginLoaded.taxonomySource, directLoaded.taxonomySource);
    assert.deepEqual(pluginLoaded.extras, directLoaded.extras);
    assert.deepEqual(pluginLoaded.settings, directLoaded.settings);

    // 4. Filter list test
    const filtered = await pluginCloud.listProjects({ search: 'Parity Test' });
    assert.ok(filtered.some((p) => p.id === testProject.meta.id));

    // 5. Delete via direct and verify with plugin
    await persistence.deleteProject(testProject.meta.id);
    const verifyAfterDelete = await pluginCloud.loadProject(testProject.meta.id);
    assert.equal(verifyAfterDelete, null);
  });
});
