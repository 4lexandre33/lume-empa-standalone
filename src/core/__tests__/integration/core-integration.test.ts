import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Core, createCore } from '../../index.ts';
import { ProjectCompiledEvent } from '../../contracts/typed-event.ts';
import type { IPluginManifest } from '../../contracts/plugin-manifest.ts';

describe('Core Microkernel Integration', () => {
  let core: Core;

  beforeEach(() => {
    core = createCore();
  });

  it('registers and activates multiple plugins with dependencies', async () => {
    const providerManifest: IPluginManifest = {
      name: 'lume-provider-plugin',
      version: '1.0.0',
      capabilities: {
        provides: [{ name: 'EngineService', version: '1.0.0' }]
      }
    };

    const consumerManifest: IPluginManifest = {
      name: 'lume-consumer-plugin',
      version: '1.0.0',
      requires: {
        mandatory: [{ name: 'lume-provider-plugin', version: '1.0.0' }]
      }
    };

    core.registerPlugin(providerManifest, async (ctx) => {
      return {
        manifest: providerManifest,
        context: ctx,
        activate: async () => {
          ctx.registerCapability({
            name: 'EngineService',
            version: '1.0.0',
            provider: 'lume-provider-plugin',
            api: {
              evaluateRule: (rule: string) => `Executed ${rule}`
            }
          });
        },
        deactivate: async () => {}
      };
    });

    let executionResult = '';
    core.registerPlugin(consumerManifest, async (ctx) => {
      return {
        manifest: consumerManifest,
        context: ctx,
        activate: async () => {
          const engine = ctx.getService<{ evaluateRule: (r: string) => string }>('EngineService');
          executionResult = engine.evaluateRule('RULE_1');
        },
        deactivate: async () => {}
      };
    });

    await core.activatePlugin('lume-provider-plugin');
    await core.activatePlugin('lume-consumer-plugin');

    assert.equal(executionResult, 'Executed RULE_1');
    assert.deepEqual(core.listActivePlugins(), ['lume-provider-plugin', 'lume-consumer-plugin']);
  });

  it('transfers typed events between decoupled plugins', async () => {
    const receivedEvents: any[] = [];

    const emitterManifest: IPluginManifest = {
      name: 'lume-emitter-plugin',
      version: '1.0.0'
    };

    const listenerManifest: IPluginManifest = {
      name: 'lume-listener-plugin',
      version: '1.0.0'
    };

    core.registerPlugin(listenerManifest, async (ctx) => {
      return {
        manifest: listenerManifest,
        context: ctx,
        activate: async () => {
          ctx.on(ProjectCompiledEvent, (evt) => {
            receivedEvents.push(evt.data);
          });
        },
        deactivate: async () => {}
      };
    });

    core.registerPlugin(emitterManifest, async (ctx) => {
      return {
        manifest: emitterManifest,
        context: ctx,
        activate: async () => {
          await ctx.emitEvent(new ProjectCompiledEvent({
            projectId: 'proj-omega',
            result: { ok: true, issues: [], durationMs: 15 },
            durationMs: 15
          }));
        },
        deactivate: async () => {}
      };
    });

    await core.activatePlugin('lume-listener-plugin');
    await core.activatePlugin('lume-emitter-plugin');

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].projectId, 'proj-omega');
  });

  it('maintains diagnostics and state visibility', async () => {
    const diagnostics = core.getDiagnostics();
    assert.ok(Array.isArray(diagnostics.plugins));
    assert.ok(Array.isArray(diagnostics.subscriptions));
    assert.ok(Array.isArray(diagnostics.isolatedPlugins));
    assert.ok(Array.isArray(diagnostics.capabilities));
  });

  it('shuts down cleanly', async () => {
    const manifest: IPluginManifest = {
      name: 'lume-shutdown-test',
      version: '1.0.0'
    };

    core.registerPlugin(manifest, async (ctx) => ({
      manifest,
      context: ctx,
      activate: async () => {},
      deactivate: async () => {}
    }));

    await core.activatePlugin('lume-shutdown-test');
    assert.equal(core.listActivePlugins().length, 1);

    await core.shutdown();
    assert.equal(core.listActivePlugins().length, 0);
  });
});
