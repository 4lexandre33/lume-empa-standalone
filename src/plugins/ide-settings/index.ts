/**
 * Lume IDE Settings Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import { IDE_SETTINGS_MANIFEST } from './manifest.ts';
import type { IdeSettingsPluginService, IdeSettings } from './types.ts';
import { DEFAULT_IDE_SETTINGS } from '../project-cloud/lib/persistence.ts';
import type { ProjectCloudService } from '../project-cloud/types.ts';

export * from './manifest.ts';
export * from './types.ts';

export class IdeSettingsPlugin implements IPlugin {
  manifest: IPluginManifest = IDE_SETTINGS_MANIFEST;
  context: PluginContext;

  private settingsService: IdeSettingsPluginService;
  private currentSettings: IdeSettings = { ...DEFAULT_IDE_SETTINGS };

  constructor(context: PluginContext) {
    this.context = context;

    this.settingsService = {
      getSettings: async (): Promise<IdeSettings> => {
        try {
          const cloud = this.context.getService<ProjectCloudService>('ProjectCloud');
          if (cloud) {
            const remote = await cloud.loadSettings();
            this.currentSettings = { ...remote };
          }
        } catch {
          // Cloud not available or offline, use local copy
        }
        return { ...this.currentSettings };
      },

      updateSettings: async (patch: Partial<IdeSettings>): Promise<IdeSettings> => {
        const next: IdeSettings = {
          ...this.currentSettings,
          ...patch,
          layout: {
            ...this.currentSettings.layout,
            ...(patch.layout ?? {})
          }
        };
        this.currentSettings = next;

        try {
          const cloud = this.context.getService<ProjectCloudService>('ProjectCloud');
          if (cloud) {
            await cloud.saveSettings(next);
          }
        } catch {
          // Storage fallback
        }

        return { ...next };
      },

      setLocale: async (locale: string): Promise<IdeSettings> => {
        return this.settingsService.updateSettings({ locale });
      },

      setOnboarding: async (onboarding: IdeSettings['onboarding']): Promise<IdeSettings> => {
        return this.settingsService.updateSettings({ onboarding });
      },

      setLayout: async (layout: IdeSettings['layout']): Promise<IdeSettings> => {
        return this.settingsService.updateSettings({ layout });
      },

      resetToDefaults: async (): Promise<IdeSettings> => {
        return this.settingsService.updateSettings({ ...DEFAULT_IDE_SETTINGS });
      },

      getDefaults: (): IdeSettings => {
        return { ...DEFAULT_IDE_SETTINGS };
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume IDE Settings Plugin...');

    this.context.registerCapability({
      name: 'IdeSettingsService',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.settingsService as any
    });

    this.context.logger.info('Lume IDE Settings Plugin activated successfully.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Lume IDE Settings Plugin deactivated.');
  }

  getSettingsService(): IdeSettingsPluginService {
    return this.settingsService;
  }
}

export function createIdeSettingsPlugin(context: PluginContext): IPlugin {
  return new IdeSettingsPlugin(context);
}
