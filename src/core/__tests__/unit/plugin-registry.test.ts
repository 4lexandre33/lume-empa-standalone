import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PluginRegistry } from '../../internal/plugin-registry.ts';
import { ConsoleLogger } from '../../logger.ts';
import type { IPluginManifest } from '../../contracts/plugin-manifest.ts';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  const sampleManifest: IPluginManifest = {
    name: 'lume-sample-plugin',
    version: '1.0.0',
    description: 'Sample plugin for test',
    capabilities: {
      provides: [{ name: 'SampleService', version: '1.0.0' }]
    }
  };

  beforeEach(() => {
    registry = new PluginRegistry(new ConsoleLogger('[Test]'));
  });

  it('registers a plugin manifest and factory', () => {
    registry.register(sampleManifest, async (ctx) => ({
      manifest: sampleManifest,
      context: ctx,
      activate: async () => {},
      deactivate: async () => {}
    }));

    const entry = registry.get('lume-sample-plugin');
    assert.ok(entry);
    assert.equal(entry.manifest.name, 'lume-sample-plugin');
    assert.equal(entry.state, 'pending');
  });

  it('rejects duplicate registrations', () => {
    const factory = async (ctx: any) => ({
      manifest: sampleManifest,
      context: ctx,
      activate: async () => {},
      deactivate: async () => {}
    });

    registry.register(sampleManifest, factory);

    assert.throws(() => {
      registry.register(sampleManifest, factory);
    }, /already registered/);
  });

  it('rejects manifests missing name or version', () => {
    assert.throws(() => {
      registry.register({ name: '', version: '1.0.0' } as any, async () => ({} as any));
    }, /must have name and version/);
  });

  it('activates and deactivates a plugin lifecycle', async () => {
    let initialized = false;
    let destroyed = false;

    const manifest: IPluginManifest = {
      name: 'lume-lifecycle-plugin',
      version: '1.0.0',
      hooks: {
        init: async () => { initialized = true; },
        destroy: async () => { destroyed = true; }
      }
    };

    registry.register(manifest, async (ctx) => ({
      manifest,
      context: ctx,
      activate: async () => {},
      deactivate: async () => {}
    }));

    await registry.activate('lume-lifecycle-plugin', {} as any);
    assert.equal(registry.getState('lume-lifecycle-plugin'), 'active');
    assert.equal(initialized, true);

    await registry.deactivate('lume-lifecycle-plugin');
    assert.equal(registry.getState('lume-lifecycle-plugin'), 'disabled');
    assert.equal(destroyed, true);
  });

  it('enforces mandatory dependency ordering', async () => {
    const dependentManifest: IPluginManifest = {
      name: 'lume-dependent-plugin',
      version: '1.0.0',
      requires: {
        mandatory: [{ name: 'lume-base-plugin', version: '1.0.0' }]
      }
    };

    registry.register(dependentManifest, async (ctx) => ({
      manifest: dependentManifest,
      context: ctx,
      activate: async () => {},
      deactivate: async () => {}
    }));

    await assert.rejects(async () => {
      await registry.activate('lume-dependent-plugin', {} as any);
    }, /missing dependencies/);
  });
});
