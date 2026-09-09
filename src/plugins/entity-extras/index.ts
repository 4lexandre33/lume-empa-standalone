/**
 * Lume Entity Extras Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import { ENTITY_EXTRAS_MANIFEST } from './manifest.ts';
import type { EntityExtrasService } from './types.ts';
import type { Project, WorldModel } from '../narrative-engine/types.ts';
import { attachEntityExtras } from '../narrative-engine/lib/world-model.ts';
import { entityDisplayName, entityDescription } from '../narrative-engine/lib/runtime.ts';

export * from './manifest.ts';
export * from './types.ts';

export class EntityExtrasPlugin implements IPlugin {
  manifest: IPluginManifest = ENTITY_EXTRAS_MANIFEST;
  context: PluginContext;

  private extrasService: EntityExtrasService;

  constructor(context: PluginContext) {
    this.context = context;

    this.extrasService = {
      getEntityExtras: (project: Project, entityId: string): Record<string, string> => {
        return project.extras[entityId] ?? {};
      },

      setEntityExtra: (project: Project, entityId: string, key: string, value: string): Project => {
        const nextExtras = {
          ...project.extras,
          [entityId]: {
            ...(project.extras[entityId] ?? {}),
            [key]: value
          }
        };
        return {
          ...project,
          extras: nextExtras
        };
      },

      removeEntityExtra: (project: Project, entityId: string, key: string): Project => {
        const current = { ...(project.extras[entityId] ?? {}) };
        delete current[key];
        const nextExtras = { ...project.extras, [entityId]: current };
        return {
          ...project,
          extras: nextExtras
        };
      },

      getDisplayName: (world: WorldModel, entityId: string): string => {
        return entityDisplayName(world, entityId);
      },

      getDescription: (world: WorldModel, entityId: string): string => {
        return entityDescription(world, entityId);
      },

      attachExtras: (world: WorldModel, extras: Record<string, Record<string, string>>): WorldModel => {
        return attachEntityExtras(world, extras);
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume Entity Extras Plugin...');

    this.context.registerCapability({
      name: 'EntityExtras',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.extrasService as any
    });

    this.context.logger.info('Lume Entity Extras Plugin activated successfully.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Lume Entity Extras Plugin deactivated.');
  }

  getExtrasService(): EntityExtrasService {
    return this.extrasService;
  }
}

export function createEntityExtrasPlugin(context: PluginContext): IPlugin {
  return new EntityExtrasPlugin(context);
}
