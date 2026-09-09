import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../index.ts';
import type { IdeStateService } from '../../types.ts';

describe('IDE State Capabilities', () => {
  let core: Core;

  beforeEach(async () => {
    core = createCore();
    // Register prerequisites
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-state');
  });

  it('provides IdeState capability and orchestrates project lifecycle in store', async () => {
    const ideService = core.getService<IdeStateService>('IdeState');
    assert.ok(ideService);

    const store = ideService.getStore();
    const initial = store.getState();
    assert.equal(initial.ready, true);
    assert.equal(initial.screen, 'welcome');

    // Create a new blank project through store actions
    store.getState().newBlank();
    const withBlank = store.getState();
    assert.equal(withBlank.screen, 'ide');
    assert.ok(withBlank.project);
    assert.ok(withBlank.compiled);
    assert.equal(withBlank.compiled.errors.length, 0);
    assert.ok(withBlank.game);

    // Edit entities
    const newEntities = `JOGADOR.{\ntags: agent;\nstats: hp=100;\nlinks: current_location=SALA;\n}\nSALA.{\ntags: place;\n}\nstart()\n`;
    store.getState().setEntities(newEntities);
    assert.equal(store.getState().project?.entitiesSource, newEntities);

    // Force recompile
    store.getState().recompile();
    const afterRecompile = store.getState();
    assert.ok(afterRecompile.compiled);
    assert.equal(afterRecompile.compiled.errors.length, 0);

    // Play interaction
    store.getState().interact('SALA');
    const afterPlay = store.getState();
    assert.ok(afterPlay.game);

    // Rewind
    store.getState().rewindTo(0);
    assert.ok(store.getState().game);
  });
});
