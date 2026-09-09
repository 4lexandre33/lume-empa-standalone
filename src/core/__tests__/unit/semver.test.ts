import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSemver, compareSemver, satisfiesSemver } from '../../internal/semver.ts';

describe('Semver Utility', () => {
  it('parses semver versions correctly', () => {
    const v1 = parseSemver('1.2.3');
    assert.deepEqual(v1, { major: 1, minor: 2, patch: 3, prerelease: undefined });

    const v2 = parseSemver('v2.0.0-beta.1');
    assert.deepEqual(v2, { major: 2, minor: 0, patch: 0, prerelease: 'beta.1' });

    const v3 = parseSemver('1');
    assert.deepEqual(v3, { major: 1, minor: 0, patch: 0, prerelease: undefined });
  });

  it('compares semver versions', () => {
    assert.ok(compareSemver('1.0.0', '2.0.0') < 0);
    assert.ok(compareSemver('2.1.0', '2.0.0') > 0);
    assert.ok(compareSemver('1.0.5', '1.0.5') === 0);
    assert.ok(compareSemver('1.0.5', '1.0.6') < 0);
  });

  it('checks version satisfaction correctly', () => {
    assert.equal(satisfiesSemver('1.2.3', '*'), true);
    assert.equal(satisfiesSemver('1.2.3', '^1.0.0'), true);
    assert.equal(satisfiesSemver('2.0.0', '^1.0.0'), false);
    assert.equal(satisfiesSemver('1.2.5', '~1.2.0'), true);
    assert.equal(satisfiesSemver('1.3.0', '~1.2.0'), false);
    assert.equal(satisfiesSemver('1.2.0', '1.2'), true);
    assert.equal(satisfiesSemver('1.2.3', '1'), true);
    assert.equal(satisfiesSemver('2.0.0', '1'), false);
  });
});
