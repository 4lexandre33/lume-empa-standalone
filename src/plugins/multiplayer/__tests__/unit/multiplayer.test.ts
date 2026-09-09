import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, Core } from '../../../../core/index.ts';
import { MULTIPLAYER_MANIFEST, createMultiplayerPlugin } from '../../index.ts';
import type { MultiplayerService } from '../../types.ts';

describe('Multiplayer Plugin', () => {
  let core: Core;
  let mpService: MultiplayerService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(MULTIPLAYER_MANIFEST, createMultiplayerPlugin);
    await core.activatePlugin('lume-multiplayer');
    mpService = core.getService<MultiplayerService>('Multiplayer');
  });

  it('declares valid manifest', () => {
    assert.equal(MULTIPLAYER_MANIFEST.name, 'lume-multiplayer');
    assert.equal(MULTIPLAYER_MANIFEST.version, '1.0.0');
    assert.ok(MULTIPLAYER_MANIFEST.capabilities?.provides?.some((c) => c.name === 'Multiplayer'));
  });

  it('provides room creation and ICE servers configuration', () => {
    const iceServers = mpService.getDefaultIceServers();
    assert.ok(Array.isArray(iceServers));
    assert.ok(iceServers.length > 0);

    const room = mpService.createRoom({
      room: 'test-story-room',
      selfId: 'peer-1',
      onPeersChanged: () => {},
      onMessage: () => {}
    });
    assert.ok(room);
    assert.equal(typeof room.join, 'function');
    assert.equal(typeof room.close, 'function');
    assert.equal(typeof room.broadcast, 'function');
    assert.equal(typeof room.send, 'function');
  });
});
