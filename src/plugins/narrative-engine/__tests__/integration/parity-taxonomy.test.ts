import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as legacyEngine from '../../lib/index.ts';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type { TaxonomyService, QueryEngineService } from '../../types.ts';

describe('Taxonomy & Query Engine Parity (Legacy vs Plugin)', () => {
  let core: Core;
  let pluginTaxonomy: TaxonomyService;
  let pluginQuery: QueryEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
    pluginTaxonomy = core.getService<TaxonomyService>('Taxonomy');
    pluginQuery = core.getService<QueryEngineService>('QueryEngine');
  });

  it('maintains 100% parity on taxonomy compilation, inheritance and queries', () => {
    const taxSource = `
      # Creatures
      goblin -> monster
      monster -> agent
      dragon -> beast
      beast -> monster
      # Items
      sword -> weapon
      weapon -> object
      potion -> consumable
      consumable -> object
      elixir -> potion
    `;

    const legacyTax = legacyEngine.compileTaxonomy(taxSource);
    const pluginTax = pluginTaxonomy.compileTaxonomy(taxSource);

    assert.equal(pluginTax.errors.length, legacyTax.errors.length);
    assert.deepEqual(pluginTaxonomy.ancestors('elixir', pluginTax), legacyTax.ancestors.get('elixir'));
    assert.deepEqual(pluginTaxonomy.ancestors('dragon', pluginTax), legacyTax.ancestors.get('dragon'));
    assert.deepEqual(pluginTaxonomy.taxonomyForest(pluginTax), legacyEngine.taxonomyForest(legacyTax));

    // Test world model queries
    const testEntity: legacyEngine.Entity = {
      id: 'G1',
      tags: new Set(['goblin']),
      stats: { hp: 30 },
      links: {}
    };

    const world = new Map<string, legacyEngine.Entity>();
    world.set('G1', testEntity);

    const legacyQueryRes = legacyEngine.query('*.agent', world, '', legacyTax);
    const pluginQueryRes = pluginQuery.query('*.agent', world, '', pluginTax);

    assert.equal(pluginQueryRes.length, legacyQueryRes.length);
    assert.equal(pluginQueryRes[0][0], legacyQueryRes[0][0]);

    assert.equal(
      pluginTaxonomy.matchesTag(testEntity, 'agent', pluginTax),
      legacyEngine.matchesTag(testEntity, 'agent', legacyTax)
    );
  });
});
