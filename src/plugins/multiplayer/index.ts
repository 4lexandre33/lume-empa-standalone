/**
 * Lume Multiplayer Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import { MULTIPLAYER_MANIFEST } from './manifest.ts';
import type { MultiplayerService, P2PRoomOptions } from './types.ts';
import { P2PRoom, defaultIceServers } from './lib/p2p.ts';

export * from './manifest.ts';
export * from './types.ts';

export class MultiplayerPlugin implements IPlugin {
  manifest: IPluginManifest = MULTIPLAYER_MANIFEST;
  context: PluginContext;

  private multiplayerService: MultiplayerService;

  constructor(context: PluginContext) {
    this.context = context;

    this.multiplayerService = {
      createRoom: (options: P2PRoomOptions) => {
        return new P2PRoom(options);
      },
      getDefaultIceServers: () => {
        return defaultIceServers();
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume Multiplayer Plugin...');

    this.context.registerCapability({
      name: 'Multiplayer',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.multiplayerService as any
    });

    this.context.logger.info('Lume Multiplayer Plugin activated successfully.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Lume Multiplayer Plugin deactivated.');
  }

  getMultiplayerService(): MultiplayerService {
    return this.multiplayerService;
  }
}

export function createMultiplayerPlugin(context: PluginContext): IPlugin {
  return new MultiplayerPlugin(context);
}
