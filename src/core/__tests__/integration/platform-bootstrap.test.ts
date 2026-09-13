import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bootLumePlatform } from '../../../bootstrap.ts';

describe('Lume EMPA Platform Final Cutover & Kernel Verification', () => {
  it('boots the complete platform and resolves capabilities across all domain plugins', async () => {
    const { core, services } = await bootLumePlatform();
    assert.ok(core);
    assert.ok(services);

    // Verify Active Plugins
    const activePlugins = core.listActivePlugins();
    assert.equal(activePlugins.length, 28);
    assert.ok(activePlugins.includes('lume-narrative-engine'));
    assert.ok(activePlugins.includes('lume-project-cloud'));
    assert.ok(activePlugins.includes('lume-ide-state'));
    assert.ok(activePlugins.includes('lume-intent-engine'));
    assert.ok(activePlugins.includes('lume-rule-semantics'));
    assert.ok(activePlugins.includes('lume-world-events'));
    assert.ok(activePlugins.includes('lume-knowledge'));
    assert.ok(activePlugins.includes('lume-agency'));
    assert.ok(activePlugins.includes('lume-spatial'));
    assert.ok(activePlugins.includes('lume-senses'));
    assert.ok(activePlugins.includes('lume-kit-adventure'));
    assert.ok(activePlugins.includes('lume-kit-social'));
    assert.ok(activePlugins.includes('lume-kit-channel'));
    assert.ok(activePlugins.includes('lume-kit-combat'));
    assert.ok(activePlugins.includes('lume-kit-prose'));
    assert.ok(activePlugins.includes('lume-sift'));
    assert.ok(activePlugins.includes('lume-dry-run'));
    assert.ok(activePlugins.includes('lume-process'));
    assert.ok(activePlugins.includes('lume-chain'));
    assert.ok(activePlugins.includes('lume-life'));
    assert.ok(activePlugins.includes('lume-nlp'));
    assert.ok(activePlugins.includes('lume-notebook'));
    assert.ok(activePlugins.includes('lume-ide-ui'));
    assert.ok(activePlugins.includes('lume-ide-guide'));
    assert.ok(activePlugins.includes('lume-ide-settings'));
    assert.ok(activePlugins.includes('lume-entity-extras'));
    assert.ok(activePlugins.includes('lume-multiplayer'));
    assert.ok(activePlugins.includes('lume-ext-host'));

    // Verify Services & Capabilities
    assert.ok(services.narrativeEngine);
    assert.ok(services.taxonomy);
    assert.ok(services.queryEngine);
    assert.ok(services.languageTools);
    assert.ok(services.projectCloud);
    assert.ok(services.projectHistory);
    assert.ok(services.ideState);
    assert.ok(services.intentEngine);
    assert.ok(services.intentCatalog);
    assert.ok(services.ruleEffects);
    assert.ok(services.ruleSemantics);
    assert.ok(services.worldEvents);
    assert.ok(services.knowledge);
    assert.ok(services.agency);
    assert.ok(services.spatial);
    assert.ok(services.senses);
    assert.ok(services.adventureKit);
    assert.ok(services.socialKit);
    assert.ok(services.channelKit);
    assert.ok(services.combatKit);
    assert.ok(services.prose);
    assert.ok(services.sift);
    assert.ok(services.dryRun);
    assert.ok(services.process);
    assert.ok(services.chain);
    assert.ok(services.life);
    assert.ok(services.nlp);
    assert.ok(services.notebook);
    assert.ok(services.ideUI);
    assert.ok(services.ideComponents);
    assert.ok(services.ideGuide);
    assert.ok(services.ideSettings);
    assert.ok(services.entityExtras);
    assert.ok(services.multiplayer);
    assert.ok(services.extHost);

    // Functional Smoke Test across decoupled plugins
    const proj = services.narrativeEngine.createProject('Final EMPA Verification', {
      entitiesSource: 'HERO.{\ntags: agent;\n}\nstart()\n',
      rulesSource: '# start\nON: start\nnarrativa: "Kernel ativo e operante."\n'
    });

    const compiled = services.narrativeEngine.compileProject(proj);
    assert.equal(compiled.errors.length, 0);

    const saved = await services.projectCloud.saveProject(proj);
    assert.equal(saved.id, proj.meta.id);

    const store = services.ideState.getStore();
    assert.ok(store);
    store.getState().hydrate();

    const parsed = services.intentEngine.parse('intent.action.wait');
    assert.equal(parsed.status, 'complete');

    const startRule = compiled.rules[0];
    assert.ok(startRule);
    assert.deepEqual(startRule.effects, []);
    assert.ok(Array.isArray(services.ruleSemantics.classify(startRule)));

    const views = services.ideUI.listRegisteredViews();
    assert.equal(views.length, 16);

    const kit = services.extHost.buildKit();
    const kitAgain = services.extHost.buildKit();
    assert.equal(kit.fingerprint, kitAgain.fingerprint);
    assert.ok(kit.files["host.json"].includes('"generatedBy": "lume-website"'));

    const guides = services.ideGuide.getGuideSlides();
    assert.ok(guides.length > 0);

    // Diagnostics Cleanliness
    const diagnostics = core.getDiagnostics();
    assert.equal(diagnostics.isolatedPlugins.length, 0);
  });
});
