import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type {
  NarrativeEngineService,
  TaxonomyService,
  QueryEngineService,
  LanguageToolsService
} from '../../types.ts';

describe('Narrative Engine Capabilities', () => {
  let core: Core;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
  });

  it('provides NarrativeEngine capability with compilation and game runtime', () => {
    const engineService = core.getService<NarrativeEngineService>('NarrativeEngine');
    assert.ok(engineService);

    const project = engineService.createProject('Test Project', {
      entitiesSource: `
JOGADOR.{
tags: agent;
stats: hp=100;
links: current_location=SALA;
}

CHEST.{
tags: object;
stats: gold=50;
links: current_location=SALA;
name: Baú;
}

SALA.{
tags: place;
stats: ;
links: ;
name: Sala;
}

start()
`,
      rulesSource: `
# start
ON: start
narrativa: "Início do teste."

# open
ON: CHEST
DO: JOGADOR.hp+10
    CHEST.gold=0
narrativa: "Você abre o baú e ganha vida!"
`
    });

    const compiled = engineService.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    assert.ok(compiled.worldModel.size >= 3);
    assert.ok(compiled.rules.length >= 2);

    const game = engineService.createGame(compiled.worldModel, compiled.rules, project.settings.playerEntityId);
    assert.equal(game.history.length, 0);

    const booted = engineService.bootGame(game);
    assert.ok(booted.history.length >= 1);

    const nextState = engineService.interact(booted, 'CHEST');
    assert.ok(nextState.history.length > booted.history.length);
    assert.match(nextState.story, /abre o baú/);

    const rewound = engineService.rewindTo(nextState, 0);
    assert.equal(rewound.history.length, 1);
  });

  it('provides Taxonomy capability with inheritance and forest computation', () => {
    const taxonomyService = core.getService<TaxonomyService>('Taxonomy');
    assert.ok(taxonomyService);

    const taxonomySource = `
      goblin -> monster
      monster -> agent
      chest -> container
      container -> object
    `;

    const compiledTax = taxonomyService.compileTaxonomy(taxonomySource);
    assert.equal(compiledTax.errors.length, 0);

    const ancestors = taxonomyService.ancestors('goblin', compiledTax);
    assert.deepEqual(ancestors, ['monster', 'agent']);

    const forest = taxonomyService.taxonomyForest(compiledTax);
    assert.ok(Array.isArray(forest));
    assert.ok(forest.length > 0);
  });

  it('provides QueryEngine capability with selector resolution', () => {
    const engineService = core.getService<NarrativeEngineService>('NarrativeEngine');
    const taxonomyService = core.getService<TaxonomyService>('Taxonomy');
    const queryEngine = core.getService<QueryEngineService>('QueryEngine');

    const compiledTax = taxonomyService.compileTaxonomy('goblin -> monster\nmonster -> agent');
    const project = engineService.createProject('Query Test', {
      entitiesSource: `
G1.{
tags: goblin;
stats: hp=10;
links: ;
}
G2.{
tags: goblin;
stats: hp=20;
links: ;
}
POTION.{
tags: object;
stats: heal=15;
links: ;
}
start()
`
    });

    const compiled = engineService.compileProject(project);
    const results = queryEngine.query('*.monster', compiled.worldModel, '', compiledTax);
    assert.equal(results.length, 2);
    assert.ok(results.some(([id]) => id === 'G1'));
    assert.ok(results.some(([id]) => id === 'G2'));
  });

  it('provides LanguageTools capability for syntax highlighting and autocomplete', () => {
    const langTools = core.getService<LanguageToolsService>('LanguageTools');
    assert.ok(langTools);

    const entityTokens = langTools.highlightSource('HERO.{\ntags: agent;\n}', 'entities');
    assert.ok(Array.isArray(entityTokens));
    assert.ok(entityTokens.length > 0);

    const ruleTokens = langTools.highlightSource('ON: HERO\nIF: HERO.hp>0\nDO: HERO.hp+1', 'rules');
    assert.ok(Array.isArray(ruleTokens));
    assert.ok(ruleTokens.length > 0);

    const vocab = langTools.collectVocabulary({});
    const completions = langTools.completeAt('HERO.{\ntags: ', 'entities', 14, vocab);
    assert.ok(Array.isArray(completions.items));
  });
});
