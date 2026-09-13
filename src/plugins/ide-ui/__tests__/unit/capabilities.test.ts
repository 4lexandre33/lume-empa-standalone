import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../../ide-state/index.ts';
import { IDE_UI_MANIFEST, createIdeUIPlugin } from '../../index.ts';
import type { IdeUIService, IdeComponentsService } from '../../types.ts';
import type { Issue } from '../../../narrative-engine/types.ts';

describe('IDE UI Plugin Capabilities', () => {
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

  it('provides IdeUI capability with view discovery, formatting and syntax methods', () => {
    const uiService = core.getService<IdeUIService>('IdeUI');
    assert.ok(uiService);

    // 1. Registered views discovery
    const views = uiService.listRegisteredViews();
    assert.ok(views.includes('IdeApp'));
    assert.ok(views.includes('SourceEditor'));
    assert.ok(views.includes('PreviewPane'));
    assert.ok(views.includes('ProjectTree'));
    assert.ok(views.includes('Inspector'));
    assert.ok(views.includes('TaxonomyPane'));
    assert.ok(views.includes('Welcome'));
    assert.ok(views.includes('Guide'));
    assert.ok(views.includes('Reference'));
    assert.ok(views.includes('ConfigPane'));
    assert.ok(views.includes('Skein'));
    assert.ok(views.includes('WorldMap'));
    assert.ok(views.includes('BeatDebug'));
    assert.ok(views.includes('WorldIndex'));
    assert.ok(views.includes('PlaySkin'));

    // 2. Component retrieval & registration
    const DummyApp = () => null;
    uiService.registerComponent('IdeApp', DummyApp as any);
    const AppComp = uiService.getComponent('IdeApp');
    assert.equal(AppComp, DummyApp);

    // 3. Menus
    const menus = uiService.getAvailableMenus();
    assert.equal(menus.length, 5);
    assert.equal(menus[0].id, 'projeto');

    // 4. Issue formatting
    const issues: Issue[] = [
      { code: 'E001', severity: 'error', message: 'Syntax error', location: { file: 'entities', line: 1 } },
      { code: 'W001', severity: 'warning', message: 'Unused entity', location: { file: 'entities', line: 5 } }
    ];
    const summary = uiService.formatIssueSummary(issues);
    assert.equal(summary.errors, 1);
    assert.equal(summary.warnings, 1);
    assert.match(summary.text, /1 erro, 1 aviso/);

    // 5. Markdown rendering
    const html = uiService.renderMarkdownToHtml('**bold** text');
    assert.match(html, /<strong>bold<\/strong>/);

    // 6. Highlight source
    const spans = uiService.highlightSourceSpans('PLAYER.{\ntags: agent;\n}', 'entities');
    assert.ok(Array.isArray(spans));
    assert.ok(spans.length > 0);
  });

  it('provides IdeComponents capability with rendering abstraction', () => {
    const compService = core.getService<IdeComponentsService>('IdeComponents');
    assert.ok(compService);

    const views = compService.listViews();
    assert.equal(views.length, 15);
    assert.ok(views.includes('Welcome'));
  });
});
