import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin } from '../../../project-cloud/index.ts';
import { IDE_STATE_MANIFEST, createIdeStatePlugin } from '../../index.ts';
import type { IdeStateService } from '../../types.ts';

describe('Reactive Compilation & Preview Orchestration', () => {
  let core: Core;
  let ideService: IdeStateService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
    core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-project-cloud');
    await core.activatePlugin('lume-ide-state');

    ideService = core.getService<IdeStateService>('IdeState');
  });

  it('coordinates reactive edits, auto-compilation, game boots and rewinds', async () => {
    const store = ideService.getStore();

    // 1. Start blank
    store.getState().newBlank();
    assert.equal(store.getState().screen, 'ide');

    // 2. Set complete story
    const validEntities = `
JOGADOR.{
tags: agent;
stats: hp=100;
links: current_location=SALA;
}
BAU.{
tags: object;
stats: gold=100;
links: current_location=SALA;
name: Baú Mágico;
}
SALA.{
tags: place;
stats: ;
links: ;
name: Sala Secreta;
}
start()
`;
    const validRules = `
# start
ON: start
narrativa: "Começo da jornada."

# open
ON: BAU
DO: JOGADOR.hp+20
    BAU.gold=0
narrativa: "Você abriu o baú mágico!"
`;

    store.getState().setEntities(validEntities);
    store.getState().setRules(validRules);
    store.getState().recompile();
    store.getState().bootPreview(true);

    const s = store.getState();
    assert.equal(s.compiled?.errors.length, 0);
    assert.ok(s.game);
    assert.equal(s.game.history.length, 1); // boot starts with start() beat

    // 3. Play interaction
    store.getState().interact('BAU');
    assert.equal(store.getState().game?.history.length, 2);
    assert.match(store.getState().game?.story ?? '', /baú mágico/);

    // 4. Rewind
    store.getState().rewindTo(0);
    assert.equal(store.getState().game?.history.length, 1);
  });
});
