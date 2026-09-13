import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../index.ts';
import type { IdeStateService } from '../../types.ts';
import { createExampleProject } from '../../../narrative-engine/lib/examples.ts';

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
    assert.ok(store.getState().skein);
    const session = store.getState().exportSessionJson();
    assert.ok(session);
    assert.ok(Array.isArray(session.triggerIds));
    store.getState().interact('JOGADOR');
    assert.ok(store.getState().skein.children.length > 0);
    assert.equal(store.getState().importSessionJson(session), true);
    assert.deepEqual(
      store.getState().game?.history.map((b) => b.triggerId),
      session.triggerIds,
    );
  });

  it('executes typed commands through the CommandBar store API', () => {
    const store = core.getService<IdeStateService>('IdeState').getStore();
    const example = createExampleProject('goblin-cave');
    store.getState().newBlank();
    store.getState().setEntities(example.entitiesSource);
    store.getState().setRules(example.rulesSource);
    store.getState().setTaxonomy(example.taxonomySource);
    store.getState().recompile();
    store.getState().bootPreview(true);

    const families = store.getState().suggestCommands('intent.').map((s) => s.token);
    assert.deepEqual(families, ['action', 'cognize', 'perceive']);

    assert.equal(store.getState().executeCommand('intent.action.interact.take.TOCHA'), true);
    assert.equal(store.getState().game?.worldModel.get('TOCHA')?.links.current_location, 'JOGADOR');
    assert.equal(store.getState().executeCommand('intent.action.interact.attack.GOBLIN'), false);
    assert.equal(store.getState().game?.worldModel.get('GOBLIN')?.tags.has('sleeping'), true);
  });
});
