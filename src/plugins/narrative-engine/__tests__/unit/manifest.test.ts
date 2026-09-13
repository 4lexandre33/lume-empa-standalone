import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NARRATIVE_ENGINE_MANIFEST } from '../../manifest.ts';

describe('Narrative Engine Plugin Manifest', () => {
  it('has valid manifest identifier and version', () => {
    assert.equal(NARRATIVE_ENGINE_MANIFEST.name, 'lume-narrative-engine');
    assert.equal(NARRATIVE_ENGINE_MANIFEST.version, '1.0.0');
    assert.ok(NARRATIVE_ENGINE_MANIFEST.description);
  });

  it('declares all 4 primary capabilities', () => {
    const provides = NARRATIVE_ENGINE_MANIFEST.capabilities?.provides;
    assert.ok(provides);
    assert.equal(provides.length, 5);

    const names = provides.map(p => p.name);
    assert.ok(names.includes('NarrativeEngine'));
    assert.ok(names.includes('Taxonomy'));
    assert.ok(names.includes('QueryEngine'));
    assert.ok(names.includes('LanguageTools'));
    assert.ok(names.includes('RuleEffects'));
  });

  it('specifies allowed event topics', () => {
    const events = NARRATIVE_ENGINE_MANIFEST.permissions?.events;
    assert.ok(events);
    assert.ok(events.includes('lume:project-compiled'));
    assert.ok(events.includes('lume:game-created'));
    assert.ok(events.includes('lume:game-beat'));
    assert.ok(events.includes('lume:game-error'));
  });
});
