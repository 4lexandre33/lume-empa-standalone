/**
 * IDE Settings Plugin Capability Interfaces & Types
 */

import type { IdeSettings } from '../project-cloud/types.ts';

export type { IdeSettings };

export interface IdeSettingsPluginService {
  getSettings(): Promise<IdeSettings>;
  updateSettings(patch: Partial<IdeSettings>): Promise<IdeSettings>;
  setLocale(locale: string): Promise<IdeSettings>;
  setOnboarding(onboarding: IdeSettings['onboarding']): Promise<IdeSettings>;
  setLayout(layout: IdeSettings['layout']): Promise<IdeSettings>;
  resetToDefaults(): Promise<IdeSettings>;
  getDefaults(): IdeSettings;
}
