import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../internal/event-bus.ts';
import { ConsoleLogger } from '../../logger.ts';
import { ProjectCompiledEvent, registerEventSchema } from '../../contracts/typed-event.ts';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(new ConsoleLogger('[Test]'));
  });

  it('emits and receives events', async () => {
    const received: any[] = [];

    eventBus.on(
      ProjectCompiledEvent,
      (evt) => {
        received.push(evt);
      },
      'test-plugin'
    );

    const event = new ProjectCompiledEvent({
      projectId: 'test-123',
      result: { ok: true, issues: [], durationMs: 40 },
      durationMs: 40
    });
    await eventBus.emit(event, 'test-plugin');

    assert.equal(received.length, 1);
    assert.equal(received[0].data.projectId, 'test-123');
  });

  it('supports multiple subscribers', async () => {
    const received1: any[] = [];
    const received2: any[] = [];

    eventBus.on(ProjectCompiledEvent, (evt) => { received1.push(evt); }, 'plugin-1');
    eventBus.on(ProjectCompiledEvent, (evt) => { received2.push(evt); }, 'plugin-2');

    const event = new ProjectCompiledEvent({
      projectId: 'test-multi',
      result: { ok: true, issues: [], durationMs: 20 },
      durationMs: 20
    });
    await eventBus.emit(event, 'test-plugin');

    assert.equal(received1.length, 1);
    assert.equal(received2.length, 1);
  });

  it('supports unsubscription', async () => {
    const received: any[] = [];
    const unsub = eventBus.on(
      ProjectCompiledEvent,
      (evt) => { received.push(evt); },
      'test-plugin'
    );

    await eventBus.emit(
      new ProjectCompiledEvent({
        projectId: 'test-1',
        result: { ok: true, issues: [], durationMs: 10 },
        durationMs: 10
      }),
      'test-plugin'
    );
    assert.equal(received.length, 1);

    unsub();

    await eventBus.emit(
      new ProjectCompiledEvent({
        projectId: 'test-2',
        result: { ok: true, issues: [], durationMs: 10 },
        durationMs: 10
      }),
      'test-plugin'
    );
    assert.equal(received.length, 1);
  });

  it('executes handlers according to priority order', async () => {
    const order: string[] = [];

    eventBus.on(ProjectCompiledEvent, () => { order.push('low'); }, 'plugin-low', { priority: 'low' });
    eventBus.on(ProjectCompiledEvent, () => { order.push('high'); }, 'plugin-high', { priority: 'high' });
    eventBus.on(ProjectCompiledEvent, () => { order.push('normal'); }, 'plugin-normal', { priority: 'normal' });

    await eventBus.emit(
      new ProjectCompiledEvent({
        projectId: 'test-priority',
        result: { ok: true, issues: [], durationMs: 10 },
        durationMs: 10
      }),
      'test-plugin'
    );

    assert.deepEqual(order, ['high', 'normal', 'low']);
  });

  it('isolates subscriber errors without stopping subsequent handlers', async () => {
    const executed: string[] = [];

    eventBus.on(
      ProjectCompiledEvent,
      () => {
        throw new Error('Failing subscriber');
      },
      'bad-plugin'
    );

    eventBus.on(
      ProjectCompiledEvent,
      () => {
        executed.push('good-plugin');
      },
      'good-plugin'
    );

    await eventBus.emit(
      new ProjectCompiledEvent({
        projectId: 'test-error-isolation',
        result: { ok: true, issues: [], durationMs: 5 },
        durationMs: 5
      }),
      'test-plugin'
    );

    assert.deepEqual(executed, ['good-plugin']);
  });

  it('validates schema when registered', async () => {
    registerEventSchema('lume:project-compiled', {
      type: 'object',
      required: ['projectId']
    });

    const validEvent = new ProjectCompiledEvent({
      projectId: 'proj-valid',
      result: { ok: true, issues: [], durationMs: 5 },
      durationMs: 5
    });
    await eventBus.emit(validEvent, 'test-plugin');

    const invalidEvent = new ProjectCompiledEvent({
      projectId: undefined as any,
      result: { ok: true, issues: [], durationMs: 5 },
      durationMs: 5
    });

    await assert.rejects(async () => {
      await eventBus.emit(invalidEvent, 'test-plugin');
    });
  });
});
