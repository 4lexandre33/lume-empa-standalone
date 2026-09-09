/**
 * Lume EMPA Platform Bootstrap & Kernel Host
 * Initializes Core Microkernel, registers and activates all domain plugins
 */

import { createCore, Core } from './core/index.ts';

// 1. Core Narrative Engine Plugin
import {
  NARRATIVE_ENGINE_MANIFEST,
  createNarrativeEnginePlugin,
  type NarrativeEngineService,
  type TaxonomyService,
  type QueryEngineService,
  type LanguageToolsService
} from './plugins/narrative-engine/index.ts';

// 2. Project Cloud & Persistence Plugin
import {
  PROJECT_CLOUD_MANIFEST,
  createProjectCloudPlugin,
  type ProjectCloudService,
  type ProjectHistoryService
} from './plugins/project-cloud/index.ts';

// 3. IDE State & Orchestration Plugin
import {
  IDE_STATE_MANIFEST,
  createIdeStatePlugin,
  type IdeStateService
} from './plugins/ide-state/index.ts';

// 4. IDE UI & Presentation Plugin
import {
  IDE_UI_MANIFEST,
  createIdeUIPlugin,
  type IdeUIService,
  type IdeComponentsService
} from './plugins/ide-ui/index.ts';

// 5. Support Plugins (Guide, Settings, Extras, Multiplayer)
import {
  IDE_GUIDE_MANIFEST,
  createIdeGuidePlugin,
  type IdeGuideService
} from './plugins/ide-guide/index.ts';

import {
  IDE_SETTINGS_MANIFEST,
  createIdeSettingsPlugin,
  type IdeSettingsPluginService
} from './plugins/ide-settings/index.ts';

import {
  ENTITY_EXTRAS_MANIFEST,
  createEntityExtrasPlugin,
  type EntityExtrasService
} from './plugins/entity-extras/index.ts';

import {
  MULTIPLAYER_MANIFEST,
  createMultiplayerPlugin,
  type MultiplayerService
} from './plugins/multiplayer/index.ts';

declare global {
  var __LUME_CORE__: Core | undefined;
}

export interface LumePlatformServices {
  narrativeEngine: NarrativeEngineService;
  taxonomy: TaxonomyService;
  queryEngine: QueryEngineService;
  languageTools: LanguageToolsService;
  projectCloud: ProjectCloudService;
  projectHistory: ProjectHistoryService;
  ideState: IdeStateService;
  ideUI: IdeUIService;
  ideComponents: IdeComponentsService;
  ideGuide: IdeGuideService;
  ideSettings: IdeSettingsPluginService;
  entityExtras: EntityExtrasService;
  multiplayer: MultiplayerService;
}

let platformCore: Core | null = null;

/**
 * Boots the Extensible Microkernel Platform and activates all 7 plugins
 */
export async function bootLumePlatform(): Promise<{ core: Core; services: LumePlatformServices }> {
  if (platformCore) {
    return {
      core: platformCore,
      services: getPlatformServices(platformCore)
    };
  }

  const core = createCore();

  // Register all plugins
  core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
  core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
  core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);
  core.registerPlugin(IDE_UI_MANIFEST, createIdeUIPlugin);
  core.registerPlugin(IDE_GUIDE_MANIFEST, createIdeGuidePlugin);
  core.registerPlugin(IDE_SETTINGS_MANIFEST, createIdeSettingsPlugin);
  core.registerPlugin(ENTITY_EXTRAS_MANIFEST, createEntityExtrasPlugin);
  core.registerPlugin(MULTIPLAYER_MANIFEST, createMultiplayerPlugin);

  // Activate plugins respecting dependency graph
  await core.activatePlugin('lume-narrative-engine');
  await core.activatePlugin('lume-project-cloud');
  await core.activatePlugin('lume-ide-state');
  await core.activatePlugin('lume-ide-ui');
  await core.activatePlugin('lume-ide-guide');
  await core.activatePlugin('lume-ide-settings');
  await core.activatePlugin('lume-entity-extras');
  await core.activatePlugin('lume-multiplayer');

  platformCore = core;
  if (typeof globalThis !== 'undefined') {
    globalThis.__LUME_CORE__ = core;
  }

  return {
    core,
    services: getPlatformServices(core)
  };
}

export function getPlatformServices(core: Core): LumePlatformServices {
  return {
    narrativeEngine: core.getService<NarrativeEngineService>('NarrativeEngine'),
    taxonomy: core.getService<TaxonomyService>('Taxonomy'),
    queryEngine: core.getService<QueryEngineService>('QueryEngine'),
    languageTools: core.getService<LanguageToolsService>('LanguageTools'),
    projectCloud: core.getService<ProjectCloudService>('ProjectCloud'),
    projectHistory: core.getService<ProjectHistoryService>('ProjectHistory'),
    ideState: core.getService<IdeStateService>('IdeState'),
    ideUI: core.getService<IdeUIService>('IdeUI'),
    ideComponents: core.getService<IdeComponentsService>('IdeComponents'),
    ideGuide: core.getService<IdeGuideService>('IdeGuide'),
    ideSettings: core.getService<IdeSettingsPluginService>('IdeSettingsService'),
    entityExtras: core.getService<EntityExtrasService>('EntityExtras'),
    multiplayer: core.getService<MultiplayerService>('Multiplayer')
  };
}

export function getLumeCore(): Core {
  if (!platformCore) {
    platformCore = createCore();
  }
  return platformCore;
}
