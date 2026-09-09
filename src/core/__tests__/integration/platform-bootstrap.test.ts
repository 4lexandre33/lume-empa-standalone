import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bootLumePlatform } from '../../../bootstrap.ts';

describe('Lume EMPA Platform Final Cutover & Kernel Verification', () => {
  it('boots the complete platform and resolves all 13 core capabilities across all 7 plugins', async () => {
    const { core, services } = await bootLumePlatform();
    assert.ok(core);
    assert.ok(services);

    // Verify Active Plugins
    const activePlugins = core.listActivePlugins();
    assert.equal(activePlugins.length, 8);
    assert.ok(activePlugins.includes('lume-narrative-engine'));
    assert.ok(activePlugins.includes('lume-project-cloud'));
    assert.ok(activePlugins.includes('lume-ide-state'));
    assert.ok(activePlugins.includes('lume-ide-ui'));
    assert.ok(activePlugins.includes('lume-ide-guide'));
    assert.ok(activePlugins.includes('lume-ide-settings'));
    assert.ok(activePlugins.includes('lume-entity-extras'));
    assert.ok(activePlugins.includes('lume-multiplayer'));

    // Verify Services & Capabilities
    assert.ok(services.narrativeEngine);
    assert.ok(services.taxonomy);
    assert.ok(services.queryEngine);
    assert.ok(services.languageTools);
    assert.ok(services.projectCloud);
    assert.ok(services.projectHistory);
    assert.ok(services.ideState);
    assert.ok(services.ideUI);
    assert.ok(services.ideComponents);
    assert.ok(services.ideGuide);
    assert.ok(services.ideSettings);
    assert.ok(services.entityExtras);
    assert.ok(services.multiplayer);

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

    const views = services.ideUI.listRegisteredViews();
    assert.equal(views.length, 10);

    const guides = services.ideGuide.getGuideSlides();
    assert.ok(guides.length > 0);

    // Diagnostics Cleanliness
    const diagnostics = core.getDiagnostics();
    assert.equal(diagnostics.isolatedPlugins.length, 0);
  });
});
