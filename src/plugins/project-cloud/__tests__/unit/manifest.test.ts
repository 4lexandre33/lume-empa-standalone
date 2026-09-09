import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_CLOUD_MANIFEST } from '../../manifest.ts';

describe('Project Cloud Plugin Manifest', () => {
  it('has valid manifest identifier and version', () => {
    assert.equal(PROJECT_CLOUD_MANIFEST.name, 'lume-project-cloud');
    assert.equal(PROJECT_CLOUD_MANIFEST.version, '1.0.0');
    assert.ok(PROJECT_CLOUD_MANIFEST.description);
  });

  it('declares ProjectCloud and ProjectHistory capabilities', () => {
    const provides = PROJECT_CLOUD_MANIFEST.capabilities?.provides;
    assert.ok(provides);
    assert.equal(provides.length, 2);

    const names = provides.map((p) => p.name);
    assert.ok(names.includes('ProjectCloud'));
    assert.ok(names.includes('ProjectHistory'));
  });

  it('specifies allowed event topics', () => {
    const events = PROJECT_CLOUD_MANIFEST.permissions?.events;
    assert.ok(events);
    assert.ok(events.includes('lume:project-saved'));
    assert.ok(events.includes('lume:project-loaded'));
    assert.ok(events.includes('lume:project-deleted'));
    assert.ok(events.includes('lume:playtest-saved'));
    assert.ok(events.includes('lume:playtest-loaded'));
  });
});
