import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from '../../../narrative-engine/index.ts';
import { ENTITY_EXTRAS_MANIFEST, createEntityExtrasPlugin } from '../../index.ts';
import type { EntityExtrasService } from '../../types.ts';
import { createProject } from '../../../narrative-engine/lib/project.ts';

describe('Entity Extras Plugin', () => {
  let core: Core;
  let extrasService: EntityExtrasService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(ENTITY_EXTRAS_MANIFEST, createEntityExtrasPlugin);

    await core.activatePlugin('lume-narrative-engine');
    await core.activatePlugin('lume-entity-extras');
    extrasService = core.getService<EntityExtrasService>('EntityExtras');
  });

  it('declares valid manifest', () => {
    assert.equal(ENTITY_EXTRAS_MANIFEST.name, 'lume-entity-extras');
    assert.equal(ENTITY_EXTRAS_MANIFEST.version, '1.0.0');
    assert.ok(ENTITY_EXTRAS_MANIFEST.capabilities?.provides?.some((c) => c.name === 'EntityExtras'));
  });

  it('manages entity visual names, descriptions and custom fields', () => {
    const project = createProject('Extras Test Project');

    // 1. Set extra
    const updated = extrasService.setEntityExtra(project, 'JOGADOR', 'name', 'O Aventureiro');
    assert.equal(extrasService.getEntityExtras(updated, 'JOGADOR').name, 'O Aventureiro');

    // 2. Remove extra
    const removed = extrasService.removeEntityExtra(updated, 'JOGADOR', 'name');
    assert.equal(extrasService.getEntityExtras(removed, 'JOGADOR').name, undefined);

    // 3. Display name and description helpers
    const world = new Map();
    world.set('GOBLIN', { id: 'GOBLIN', tags: new Set(['monster']), stats: {}, links: {}, extra: { name: 'Goblin Esperto', description: 'Um monstro astuto.' } });

    assert.equal(extrasService.getDisplayName(world, 'GOBLIN'), 'Goblin Esperto');
    assert.equal(extrasService.getDescription(world, 'GOBLIN'), 'Um monstro astuto.');
  });
});
