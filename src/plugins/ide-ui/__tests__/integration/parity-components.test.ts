import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../../ide-state/index.ts';
import { IDE_UI_MANIFEST, createIdeUIPlugin } from '../../index.ts';
import type { IdeUIService } from '../../types.ts';

describe('IDE UI Component Parity (View Registry)', () => {
  let core: Core;
  let pluginUi: IdeUIService;

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

    pluginUi = core.getService<IdeUIService>('IdeUI');
  });

  it('maintains 100% component registry for all 10 visual surfaces and menus', () => {
    const views = pluginUi.listRegisteredViews();
    assert.equal(views.length, 16);
    assert.deepEqual(views, [
      'IdeApp',
      'SourceEditor',
      'PreviewPane',
      'ProjectTree',
      'Inspector',
      'TaxonomyPane',
      'Welcome',
      'Guide',
      'Reference',
      'ConfigPane',
      'Skein',
      'WorldMap',
      'BeatDebug',
      'WorldIndex',
      'PlaySkin',
      'NotebookPane'
    ]);

    const menus = pluginUi.getAvailableMenus();
    assert.equal(menus.length, 5);
    const menuIds = menus.map((m) => m.id);
    assert.deepEqual(menuIds, ['projeto', 'editar', 'executar', 'depurar', 'ajuda']);
  });

  it('allows dynamic component registration and retrieval', () => {
    const DummyComponent = () => null;
    pluginUi.registerComponent('Welcome', DummyComponent as any);
    assert.equal(pluginUi.getComponent('Welcome'), DummyComponent);
  });
});
