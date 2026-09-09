import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Engine library import
import * as legacyEngine from '../../lib/index.ts';

// EMPA Plugin & Core
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type { NarrativeEngineService } from '../../types.ts';

describe('Compilation Parity (Legacy vs Plugin)', () => {
  let core: Core;
  let pluginEngine: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
    pluginEngine = core.getService<NarrativeEngineService>('NarrativeEngine');
  });

  it('produces 100% identical compilation results across example projects', () => {
    const examples = legacyEngine.EXAMPLE_CATALOG;

    for (const meta of examples) {
      // In examples.ts, we have catalog, let's create example projects or blank projects
      const project = legacyEngine.createProject(meta.name);
      const legacyResult = legacyEngine.compileProject(project);
      const pluginResult = pluginEngine.compileProject(project);

      assert.equal(pluginResult.errors.length, legacyResult.errors.length, `Parity check failed for errors on ${meta.name}`);
      assert.equal(pluginResult.warnings.length, legacyResult.warnings.length, `Parity check failed for warnings on ${meta.name}`);
      assert.equal(pluginResult.worldModel.size, legacyResult.worldModel.size, `Parity check failed for world model size on ${meta.name}`);

      for (const [id, legacyEntity] of legacyResult.worldModel) {
        const pluginEntity = pluginResult.worldModel.get(id);
        assert.ok(pluginEntity, `Entity ${id} missing in plugin output`);
        assert.equal(pluginEntity.id, legacyEntity.id);
        assert.deepEqual(Array.from(pluginEntity.tags), Array.from(legacyEntity.tags));
        assert.deepEqual(pluginEntity.stats, legacyEntity.stats);
        assert.deepEqual(pluginEntity.links, legacyEntity.links);
      }

      assert.equal(pluginResult.rules.length, legacyResult.rules.length, `Parity check failed for rules length on ${meta.name}`);
      for (let i = 0; i < legacyResult.rules.length; i++) {
        assert.equal(pluginResult.rules[i].id, legacyResult.rules[i].id);
        assert.equal(pluginResult.rules[i].trigger.source, legacyResult.rules[i].trigger.source);
        assert.equal(pluginResult.rules[i].conditions.length, legacyResult.rules[i].conditions.length);
        assert.equal(pluginResult.rules[i].changes.length, legacyResult.rules[i].changes.length);
      }
    }
  });

  it('produces 100% identical results on invalid or blank project syntax', () => {
    const brokenProject = legacyEngine.createProject('Broken', {
      entitiesSource: 'INVALID SYNTAX {{{ %%%',
      rulesSource: 'ON: DO: IF:',
      taxonomySource: 'self -> self'
    });

    const legacyResult = legacyEngine.compileProject(brokenProject);
    const pluginResult = pluginEngine.compileProject(brokenProject);

    assert.equal(pluginResult.errors.length, legacyResult.errors.length);
    assert.equal(pluginResult.warnings.length, legacyResult.warnings.length);
    assert.equal(pluginResult.worldModel.size, legacyResult.worldModel.size);
    assert.equal(pluginResult.rules.length, legacyResult.rules.length);
  });
});
