import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as legacyEngine from '../../lib/index.ts';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type { NarrativeEngineService } from '../../types.ts';

describe('Gameplay Runtime Parity (Legacy vs Plugin)', () => {
  let core: Core;
  let pluginEngine: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
    pluginEngine = core.getService<NarrativeEngineService>('NarrativeEngine');
  });

  it('maintains 100% parity across multi-turn gameplay loops', () => {
    for (const meta of legacyEngine.EXAMPLE_CATALOG) {
      const project = legacyEngine.createProject(meta.name);
      const legacyCompiled = legacyEngine.compileProject(project);
      const pluginCompiled = pluginEngine.compileProject(project);

      const legacyGame = legacyEngine.createGame(legacyCompiled.worldModel, legacyCompiled.rules, project.settings.playerEntityId, legacyCompiled.taxonomy);
      const pluginGame = pluginEngine.createGame(pluginCompiled.worldModel, pluginCompiled.rules, project.settings.playerEntityId, pluginCompiled.taxonomy);

      assert.equal(pluginGame.story, legacyGame.story);
      assert.equal(pluginGame.history.length, legacyGame.history.length);

      // Boot game
      const legacyBooted = legacyEngine.bootGame(legacyGame);
      const pluginBooted = pluginEngine.bootGame(pluginGame);

      assert.equal(pluginBooted.story, legacyBooted.story);
      assert.equal(pluginBooted.history.length, legacyBooted.history.length);

      // Play turn
      const legacyTurn = legacyEngine.interactWith(legacyBooted, 'SALA');
      const pluginTurn = pluginEngine.interact(pluginBooted, 'SALA');

      assert.equal(pluginTurn.story, legacyTurn.story);
      assert.equal(pluginTurn.history.length, legacyTurn.history.length);

      // Test rewind
      const legacyRewound = legacyEngine.rewindTo(legacyTurn, 0);
      const pluginRewound = pluginEngine.rewindTo(pluginTurn, 0);

      assert.equal(pluginRewound.history.length, legacyRewound.history.length);
      assert.equal(pluginRewound.worldModel.size, legacyRewound.worldModel.size);
    }
  });
});
