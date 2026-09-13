import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../../ide-state/index.ts';
import { IDE_UI_MANIFEST, createIdeUIPlugin } from '../../index.ts';
import type { IdeComponentsService, IdeUIService } from '../../types.ts';

describe('IDE View Registry & Rendering Service', () => {
  let core: Core;
  let pluginUi: IdeUIService;
  let pluginComponents: IdeComponentsService;

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
    pluginComponents = core.getService<IdeComponentsService>('IdeComponents');
  });

  it('allows registering and retrieving components through IdeComponents capability', () => {
    const DummyWelcome = () => null;
    const DummyGuide = () => null;

    pluginComponents.registerComponent('Welcome', DummyWelcome as any);
    pluginComponents.registerComponent('Guide', DummyGuide as any);

    assert.equal(pluginComponents.getComponent('Welcome'), DummyWelcome);
    assert.equal(pluginComponents.getComponent('Guide'), DummyGuide);
  });

  it('lists registered views exhaustively', () => {
    const views = pluginUi.listRegisteredViews();
    assert.equal(views.length, 15);
  });
});
