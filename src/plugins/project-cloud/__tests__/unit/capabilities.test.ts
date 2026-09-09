import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../index.ts';
import type { ProjectCloudService, ProjectHistoryService } from '../../types.ts';
import { createProject } from '../../../narrative-engine/lib/project.ts';

describe('Project Cloud Capabilities', () => {
  let core: Core;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    await core.activatePlugin('lume-project-cloud');
  });

  it('provides ProjectCloud capability for full CRUD lifecycle', async () => {
    const cloudService = core.getService<ProjectCloudService>('ProjectCloud');
    assert.ok(cloudService);

    const testProject = createProject('Cloud Capability Test', {
      entitiesSource: 'HERO.{\ntags: agent;\n}\nstart()\n',
      rulesSource: '# start\nON: start\nnarrativa: "Início"\n',
      taxonomySource: 'hero -> agent'
    });

    // 1. Save
    const savedEntry = await cloudService.saveProject(testProject);
    assert.equal(savedEntry.id, testProject.meta.id);
    assert.equal(savedEntry.name, 'Cloud Capability Test');

    // 2. List
    const list = await cloudService.listProjects();
    assert.ok(list.some((p) => p.id === testProject.meta.id));

    // 3. Load
    const loaded = await cloudService.loadProject(testProject.meta.id);
    assert.ok(loaded);
    assert.equal(loaded.meta.name, 'Cloud Capability Test');
    assert.equal(loaded.entitiesSource, testProject.entitiesSource);
    assert.equal(loaded.taxonomySource, testProject.taxonomySource);

    // 4. Delete
    const deleteRes = await cloudService.deleteProject(testProject.meta.id);
    assert.equal(deleteRes.ok, true);

    const afterDelete = await cloudService.loadProject(testProject.meta.id);
    assert.equal(afterDelete, null);
  });

  it('provides ProjectHistory capability with versioning and rollback', async () => {
    const cloudService = core.getService<ProjectCloudService>('ProjectCloud');
    const historyService = core.getService<ProjectHistoryService>('ProjectHistory');
    assert.ok(historyService);

    const project = createProject('History Test Project');
    await cloudService.saveProject(project);

    // Make changes and save version 2
    project.entitiesSource = 'WARRIOR.{\ntags: agent;\n}\nstart()\n';
    await cloudService.saveProject(project);

    const versions = await historyService.listVersions(project.meta.id);
    assert.equal(versions.length, 2);
    assert.equal(versions[0].version, 1);
    assert.equal(versions[1].version, 2);

    // Rollback to version 1
    const rolledBack = await historyService.rollback(project.meta.id, 1);
    assert.ok(rolledBack);
    assert.equal(rolledBack.entitiesSource, createProject('History Test Project').entitiesSource);

    // Clean up
    await cloudService.deleteProject(project.meta.id);
  });
});
