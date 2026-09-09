import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import {
  ProjectCompiledEvent,
  GameCreatedEvent,
  GameBeatGeneratedEvent
} from '../../../../core/contracts/typed-event.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../index.ts';
import type { NarrativeEngineService } from '../../types.ts';

describe('Narrative Engine Event Emissions', () => {
  let core: Core;
  let engineService: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin('lume-narrative-engine');
    engineService = core.getService<NarrativeEngineService>('NarrativeEngine');
  });

  it('emits ProjectCompiledEvent on compileProjectAsync', async () => {
    let receivedData: any = null;

    core.on(ProjectCompiledEvent, (evt) => {
      receivedData = evt.data;
    });

    const project = engineService.createProject('Event Test Project', {
      id: 'project-async-event-test',
      entitiesSource: 'PLAYER.{\ntags: agent;\nstats: ;\nlinks: ;\n}\nstart()\n'
    });

    const result = await engineService.compileProjectAsync(project);
    assert.equal(result.errors.length, 0);

    assert.ok(receivedData);
    assert.equal(receivedData.projectId, 'project-async-event-test');
    assert.equal(receivedData.result.ok, true);
  });

  it('emits GameCreatedEvent and GameBeatGeneratedEvent on gameplay loop', async () => {
    let createdGameEvent: any = null;
    let beatEvent: any = null;

    core.on(GameCreatedEvent, (evt) => {
      createdGameEvent = evt.data;
    });

    core.on(GameBeatGeneratedEvent, (evt) => {
      beatEvent = evt.data;
    });

    const project = engineService.createProject('Gameplay Events Project', {
      id: 'proj-game-events',
      entitiesSource: `
ALCHEMIST.{
tags: agent;
stats: mana=10;
links: current_location=LAB;
}
CRYSTAL.{
tags: object;
stats: ;
links: current_location=LAB;
name: Cristal;
}
LAB.{
tags: place;
stats: ;
links: ;
name: Laboratório;
}
start()
`,
      rulesSource: `
# start
ON: start
narrativa: "Início"

# touch
ON: CRYSTAL
DO: ALCHEMIST.mana+5
narrativa: "O cristal pulsa com energia!"
`
    });

    const compiled = await engineService.compileProjectAsync(project);
    const game = await engineService.createGameAsync(compiled.worldModel, compiled.rules, project.settings.playerEntityId);

    assert.ok(createdGameEvent);
    assert.equal(createdGameEvent.projectId, 'JOGADOR');

    const nextState = await engineService.interactAsync(game, 'CRYSTAL');

    assert.ok(beatEvent);
    assert.equal(beatEvent.turn, 1);
    assert.match(beatEvent.beat.narrative, /cristal pulsa/);
    assert.equal(nextState.history.length, 1);
  });
});
