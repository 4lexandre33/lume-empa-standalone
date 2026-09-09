import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import {
  ProjectSavedEvent,
  ProjectLoadedEvent,
  ProjectDeletedEvent,
  PlaytestSavedEvent,
  PlaytestLoadedEvent
} from '../../../../core/contracts/typed-event.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../index.ts';
import type { ProjectCloudService } from '../../types.ts';
import { createProject } from '../../../narrative-engine/lib/project.ts';

describe('Project Cloud Event Emissions', () => {
  let core: Core;
  let cloudService: ProjectCloudService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    await core.activatePlugin('lume-project-cloud');
    cloudService = core.getService<ProjectCloudService>('ProjectCloud');
  });

  it('emits ProjectSavedEvent, ProjectLoadedEvent and ProjectDeletedEvent', async () => {
    let savedEvent: any = null;
    let loadedEvent: any = null;
    let deletedEvent: any = null;

    core.on(ProjectSavedEvent, (evt) => {
      savedEvent = evt.data;
    });

    core.on(ProjectLoadedEvent, (evt) => {
      loadedEvent = evt.data;
    });

    core.on(ProjectDeletedEvent, (evt) => {
      deletedEvent = evt.data;
    });

    const project = createProject('Event Emission Project');
    await cloudService.saveProject(project);

    assert.ok(savedEvent);
    assert.equal(savedEvent.projectId, project.meta.id);

    await cloudService.loadProject(project.meta.id);
    assert.ok(loadedEvent);
    assert.equal(loadedEvent.projectId, project.meta.id);

    await cloudService.deleteProject(project.meta.id);
    assert.ok(deletedEvent);
    assert.equal(deletedEvent.projectId, project.meta.id);
  });

  it('emits PlaytestSavedEvent and PlaytestLoadedEvent', async () => {
    let playtestSaved: any = null;
    let playtestLoaded: any = null;

    core.on(PlaytestSavedEvent, (evt) => {
      playtestSaved = evt.data;
    });

    core.on(PlaytestLoadedEvent, (evt) => {
      playtestLoaded = evt.data;
    });

    const project = createProject('Playtest Events Project');
    await cloudService.saveProject(project);

    const snapshot = { turn: 5, playerLocation: 'CAVERNA' };
    await cloudService.savePlaytest(project.meta.id, snapshot);

    assert.ok(playtestSaved);
    assert.equal(playtestSaved.projectId, project.meta.id);

    const loaded = await cloudService.loadPlaytest(project.meta.id);
    assert.ok(loaded);
    assert.ok(playtestLoaded);
    assert.equal(playtestLoaded.projectId, project.meta.id);
    assert.deepEqual(playtestLoaded.snapshot, snapshot);

    // Clean up
    await cloudService.deletePlaytest(project.meta.id);
    await cloudService.deleteProject(project.meta.id);
  });
});
