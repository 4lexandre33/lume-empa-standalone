import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../../ide-state/index.ts';
import { IDE_UI_MANIFEST, createIdeUIPlugin } from '../../index.ts';
import {
  EntityInteractEvent,
  UserEditedSourceEvent,
  UserClickedPlayEvent,
  UserClickedRewindEvent
} from '../../../../core/contracts/typed-event.ts';

describe('IDE UI Event Subscriptions & Telemetry', () => {
  let core: Core;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);
    core.registerPlugin(IDE_UI_MANIFEST, createIdeUIPlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-state');
    await core.activatePlugin('lume-ide-ui');
  });

  it('handles UI interaction events on EventBus without throwing errors', async () => {
    const capturedEvents: string[] = [];

    core.on(EntityInteractEvent, (evt) => {
      capturedEvents.push(evt.data.entityId);
    });

    core.on(UserEditedSourceEvent, (evt) => {
      capturedEvents.push(evt.data.sourceType);
    });

    core.on(UserClickedPlayEvent, (evt) => {
      capturedEvents.push(evt.data.projectId);
    });

    core.on(UserClickedRewindEvent, (evt) => {
      capturedEvents.push(`rewind-${evt.data.turnIndex}`);
    });

    await core.emitEvent(new EntityInteractEvent({
      projectId: 'p1',
      entityId: 'GOBLIN'
    }), 'lume-ide-ui');

    await core.emitEvent(new UserEditedSourceEvent({
      projectId: 'p1',
      sourceType: 'rules',
      newSource: 'ON: start'
    }), 'lume-ide-ui');

    await core.emitEvent(new UserClickedPlayEvent({
      projectId: 'p1',
      compiled: { ok: true, issues: [], durationMs: 5 }
    }), 'lume-ide-ui');

    await core.emitEvent(new UserClickedRewindEvent({
      projectId: 'p1',
      turnIndex: 2
    }), 'lume-ide-ui');

    assert.equal(capturedEvents.length, 4);
    assert.ok(capturedEvents.includes('GOBLIN'));
    assert.ok(capturedEvents.includes('rules'));
    assert.ok(capturedEvents.includes('p1'));
    assert.ok(capturedEvents.includes('rewind-2'));
  });
});
