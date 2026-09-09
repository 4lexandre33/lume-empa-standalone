import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../index.ts';
import {
  UserEditedSourceEvent,
  ProjectCompiledEvent,
  GameCreatedEvent
} from '../../../../core/contracts/typed-event.ts';
import type { IdeStateService } from '../../types.ts';

describe('IDE State Event Emissions', () => {
  let core: Core;
  let ideService: IdeStateService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-state');

    ideService = core.getService<IdeStateService>('IdeState');
  });

  it('emits UserEditedSourceEvent, ProjectCompiledEvent and GameCreatedEvent on store updates', async () => {
    let userEditedEvent: any = null;
    let compiledEvent: any = null;
    let gameCreatedEvent: any = null;

    core.on(UserEditedSourceEvent, (evt) => {
      userEditedEvent = evt.data;
    });

    core.on(ProjectCompiledEvent, (evt) => {
      compiledEvent = evt.data;
    });

    core.on(GameCreatedEvent, (evt) => {
      gameCreatedEvent = evt.data;
    });

    const store = ideService.getStore();
    store.getState().newBlank();

    assert.ok(compiledEvent);
    assert.ok(gameCreatedEvent);

    store.getState().setEntities('PLAYER.{\ntags: agent;\n}\nstart()\n');
    assert.ok(userEditedEvent);
    assert.equal(userEditedEvent.sourceType, 'entities');
  });
});
