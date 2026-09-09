/**
 * Multiplayer Capability Interfaces & Types
 */

import type { PeerInfo, P2PRoomOptions, P2PRoom } from './lib/p2p.ts';

export type { PeerInfo, P2PRoomOptions, P2PRoom };

export interface MultiplayerService {
  createRoom(options: P2PRoomOptions): P2PRoom;
  getDefaultIceServers(): RTCIceServer[];
}
