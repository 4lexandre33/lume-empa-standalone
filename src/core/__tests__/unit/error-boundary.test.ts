import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorBoundary } from '../../internal/error-boundary.ts';
import { ConsoleLogger } from '../../logger.ts';

describe('ErrorBoundary', () => {
  let errorBoundary: ErrorBoundary;

  beforeEach(() => {
    errorBoundary = new ErrorBoundary(new ConsoleLogger('[Test]'));
  });

  it('catches and isolates synchronous or asynchronous errors', async () => {
    const result = await errorBoundary.try('faulty-plugin', async () => {
      throw new Error('Simulation of unhandled failure');
    }, { retries: 1, isolateOnFail: true });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error.message, /Simulation of unhandled failure/);
    }
    assert.equal(errorBoundary.isIsolated('faulty-plugin'), true);
  });

  it('returns value on successful execution', async () => {
    const result = await errorBoundary.try('healthy-plugin', async () => {
      return 42;
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, 42);
    }
  });

  it('retries before failing and isolating', async () => {
    let attempts = 0;

    const result = await errorBoundary.try(
      'flaky-plugin',
      async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary glitch');
        }
        return 'recovered';
      },
      { retries: 3 }
    );

    assert.equal(result.ok, true);
    assert.equal(attempts, 2);
    if (result.ok) {
      assert.equal(result.value, 'recovered');
    }
    assert.equal(errorBoundary.isIsolated('flaky-plugin'), false);
  });

  it('allows recovering previously isolated plugins', async () => {
    await errorBoundary.try('bad-plugin', async () => {
      throw new Error('Critical fault');
    }, { isolateOnFail: true });

    assert.equal(errorBoundary.isIsolated('bad-plugin'), true);

    errorBoundary.recover('bad-plugin');
    assert.equal(errorBoundary.isIsolated('bad-plugin'), false);
  });
});
