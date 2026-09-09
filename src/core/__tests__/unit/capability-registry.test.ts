import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry } from '../../internal/capability-registry.ts';
import { ConsoleLogger } from '../../logger.ts';

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry(new ConsoleLogger('[Test]'));
  });

  it('registers and retrieves capabilities', () => {
    registry.register({
      name: 'NarrativeEngine',
      version: '1.0.0',
      provider: 'lume-narrative-engine',
      api: {
        compile: () => ({ ok: true })
      }
    });

    const cap = registry.get('NarrativeEngine', '1.0.0');
    assert.ok(cap);
    assert.equal(cap.name, 'NarrativeEngine');
  });

  it('resolves capability methods using use() with exact and range versions', () => {
    registry.register({
      name: 'NarrativeEngine',
      version: '1.2.0',
      provider: 'lume-narrative-engine',
      api: {
        calculate: (x: number) => x * 2
      }
    });

    // Sem version especificada
    const service1 = registry.use<{ calculate: (x: number) => number }>('NarrativeEngine');
    assert.equal(service1.calculate(5), 10);

    // Com range semver ^1.0.0
    const service2 = registry.use<{ calculate: (x: number) => number }>('NarrativeEngine', '^1.0.0');
    assert.equal(service2.calculate(10), 20);
  });

  it('throws CapabilityNotFoundError when capability is not registered', () => {
    assert.throws(() => {
      registry.use('NonExistentService', '1.0.0');
    }, /not available/);
  });

  it('rejects duplicate capability registrations', () => {
    const entry = {
      name: 'DuplicateService',
      version: '1.0.0',
      provider: 'test-plugin',
      api: {}
    };

    registry.register(entry);
    assert.throws(() => {
      registry.register(entry);
    }, /already registered/);
  });
});
