import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IDE_STATE_MANIFEST } from '../../manifest.ts';

describe('IDE State Plugin Manifest', () => {
  it('has valid manifest identifier and version', () => {
    assert.equal(IDE_STATE_MANIFEST.name, 'lume-ide-state');
    assert.equal(IDE_STATE_MANIFEST.version, '1.0.0');
    assert.ok(IDE_STATE_MANIFEST.description);
  });

  it('declares IdeState and IdeStore capabilities', () => {
    const provides = IDE_STATE_MANIFEST.capabilities?.provides;
    assert.ok(provides);
    assert.equal(provides.length, 2);

    const names = provides.map((p) => p.name);
    assert.ok(names.includes('IdeState'));
    assert.ok(names.includes('IdeStore'));
  });

  it('declares mandatory dependencies on NarrativeEngine and ProjectCloud', () => {
    const requires = IDE_STATE_MANIFEST.requires?.mandatory;
    assert.ok(requires);
    const reqNames = requires.map((r) => r.name);
    assert.ok(reqNames.includes('NarrativeEngine'));
    assert.ok(reqNames.includes('ProjectCloud'));
  });

  it('specifies allowed event topics', () => {
    const events = IDE_STATE_MANIFEST.permissions?.events;
    assert.ok(events);
    assert.ok(events.includes('lume:project-compiled'));
    assert.ok(events.includes('lume:game-created'));
    assert.ok(events.includes('lume:user-edited-source'));
    assert.ok(events.includes('lume:user-clicked-rewind'));
  });
});
