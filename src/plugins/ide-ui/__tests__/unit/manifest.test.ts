import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IDE_UI_MANIFEST } from '../../manifest.ts';

describe('IDE UI Plugin Manifest', () => {
  it('has valid manifest identifier and version', () => {
    assert.equal(IDE_UI_MANIFEST.name, 'lume-ide-ui');
    assert.equal(IDE_UI_MANIFEST.version, '1.0.0');
    assert.ok(IDE_UI_MANIFEST.description);
  });

  it('declares IdeUI and IdeComponents capabilities', () => {
    const provides = IDE_UI_MANIFEST.capabilities?.provides;
    assert.ok(provides);
    assert.equal(provides.length, 2);

    const names = provides.map((p) => p.name);
    assert.ok(names.includes('IdeUI'));
    assert.ok(names.includes('IdeComponents'));
  });

  it('declares mandatory dependencies on NarrativeEngine, ProjectCloud and IdeStore', () => {
    const requires = IDE_UI_MANIFEST.requires?.mandatory;
    assert.ok(requires);
    const reqNames = requires.map((r) => r.name);
    assert.ok(reqNames.includes('NarrativeEngine'));
    assert.ok(reqNames.includes('ProjectCloud'));
    assert.ok(reqNames.includes('IdeStore'));
  });

  it('specifies allowed event topics', () => {
    const events = IDE_UI_MANIFEST.permissions?.events;
    assert.ok(events);
    assert.ok(events.includes('lume:entity-interact'));
    assert.ok(events.includes('lume:user-edited-source'));
    assert.ok(events.includes('lume:user-clicked-play'));
    assert.ok(events.includes('lume:user-clicked-rewind'));
  });
});
