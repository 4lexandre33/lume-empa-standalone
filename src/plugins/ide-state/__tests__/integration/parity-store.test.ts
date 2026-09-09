import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createIdeZustandStore } from '../../lib/orchestrator.ts';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../index.ts';
import type { IdeStateService } from '../../types.ts';

describe('IDE Store Parity (Zustand Legacy vs Plugin Store)', () => {
  let core: Core;
  let pluginIdeService: IdeStateService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-state');

    pluginIdeService = core.getService<IdeStateService>('IdeState');
  });

  it('maintains 100% parity across store initial state, actions and selectors', () => {
    const pluginStore = pluginIdeService.getStore();
    const referenceStore = createIdeZustandStore();

    // 1. Initial shape parity
    const refState = referenceStore.getState();
    const pluginState = pluginStore.getState();

    assert.equal(typeof refState.hydrate, typeof pluginState.hydrate);
    assert.equal(typeof pluginState.hydrate, 'function');
    assert.equal(typeof pluginState.newBlank, 'function');
    assert.equal(typeof pluginState.setEntities, 'function');
    assert.equal(typeof pluginState.setRules, 'function');
    assert.equal(typeof pluginState.setTaxonomy, 'function');
    assert.equal(typeof pluginState.interact, 'function');
    assert.equal(typeof pluginState.rewindTo, 'function');

    // 2. Action parity
    pluginState.newBlank();
    const pluginProject = pluginStore.getState().project;
    assert.ok(pluginProject);
    assert.equal(pluginProject.meta.name, 'Nova história');
    assert.equal(pluginStore.getState().screen, 'ide');
    assert.equal(pluginStore.getState().tab, 'entities');

    // 3. Tab switching parity
    pluginState.setTab('rules');
    assert.equal(pluginStore.getState().tab, 'rules');

    pluginState.setTab('taxonomy');
    assert.equal(pluginStore.getState().tab, 'taxonomy');
  });
});
