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

import {
  INTENT_ENGINE_MANIFEST,
  createIntentEnginePlugin,
  type IntentEngineService,
  type IntentCatalogService
} from './plugins/intent-engine/index.ts';

import {
  RULE_SEMANTICS_MANIFEST,
  createRuleSemanticsPlugin,
  type RuleSemanticsService
} from './plugins/rule-semantics/index.ts';

import {
  WORLD_EVENTS_MANIFEST,
  createWorldEventsPlugin,
  type WorldEventsService
} from './plugins/world-events/index.ts';

import {
  KNOWLEDGE_MANIFEST,
  createKnowledgePlugin,
  type KnowledgeService
} from './plugins/knowledge/index.ts';

import {
  AGENCY_MANIFEST,
  createAgencyPlugin,
  type AgencyService
} from './plugins/agency/index.ts';

import {
  SPATIAL_MANIFEST,
  createSpatialPlugin,
  type SpatialService
} from './plugins/spatial/index.ts';

import {
  SENSES_MANIFEST,
  createSensesPlugin,
  type SensesService
} from './plugins/senses/index.ts';

import {
  KIT_ADVENTURE_MANIFEST,
  createKitAdventurePlugin,
  type AdventureKitService
} from './plugins/kit-adventure/index.ts';

import {
  KIT_SOCIAL_MANIFEST,
  createKitSocialPlugin,
  type SocialKitService
} from './plugins/kit-social/index.ts';

import {
  KIT_CHANNEL_MANIFEST,
  createKitChannelPlugin,
  type ChannelKitService
} from './plugins/kit-channel/index.ts';

import {
  KIT_COMBAT_MANIFEST,
  createKitCombatPlugin,
  type CombatKitService
} from './plugins/kit-combat/index.ts';

import {
  KIT_PROSE_MANIFEST,
  createKitProsePlugin,
  type ProseService
} from './plugins/kit-prose/index.ts';

import {
  SIFT_MANIFEST,
  createSiftPlugin,
  type SiftService
} from './plugins/sift/index.ts';

import {
  DRY_RUN_MANIFEST,
  createDryRunPlugin,
  type DryRunService
} from './plugins/dry-run/index.ts';

import {
  PROCESS_MANIFEST,
  createProcessPlugin,
  type ProcessService
} from './plugins/process/index.ts';

import {
  CHAIN_MANIFEST,
  createChainPlugin,
  type ChainService
} from './plugins/chain/index.ts';

import {
  LIFE_MANIFEST,
  createLifePlugin,
  type LifeService
} from './plugins/life/index.ts';

import {
  NLP_MANIFEST,
  createNlpPlugin,
  type NlpService
} from './plugins/nlp/index.ts';

import type { RuleEffectsService } from './plugins/narrative-engine/index.ts';

import {
  EXT_HOST_MANIFEST,
  createExtHostPlugin,
  type ExtHostService
} from './plugins/ext-host/index.ts';

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
  intentEngine: IntentEngineService;
  intentCatalog: IntentCatalogService;
  ruleEffects: RuleEffectsService;
  ruleSemantics: RuleSemanticsService;
  worldEvents: WorldEventsService;
  knowledge: KnowledgeService;
  agency: AgencyService;
  spatial: SpatialService;
  senses: SensesService;
  adventureKit: AdventureKitService;
  socialKit: SocialKitService;
  channelKit: ChannelKitService;
  combatKit: CombatKitService;
  prose: ProseService;
  sift: SiftService;
  dryRun: DryRunService;
  process: ProcessService;
  chain: ChainService;
  life: LifeService;
  nlp: NlpService;
  ideUI: IdeUIService;
  ideComponents: IdeComponentsService;
  ideGuide: IdeGuideService;
  ideSettings: IdeSettingsPluginService;
  entityExtras: EntityExtrasService;
  multiplayer: MultiplayerService;
  extHost: ExtHostService;
}

let platformCore: Core | null = null;

/**
 * Boots the Extensible Microkernel Platform and activates all domain plugins
 */
export async function bootLumePlatform(): Promise<{ core: Core; services: LumePlatformServices }> {
  if (platformCore) {
    return {
      core: platformCore,
      services: getPlatformServices(platformCore)
    };
  }

  const core = createCore();
  platformCore = core;
  if (typeof globalThis !== 'undefined') {
    globalThis.__LUME_CORE__ = core;
  }

  // Register all plugins
  core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
  core.registerPlugin(PROJECT_CLOUD_MANIFEST, createProjectCloudPlugin);
  core.registerPlugin(IDE_STATE_MANIFEST, createIdeStatePlugin);
  core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
  core.registerPlugin(RULE_SEMANTICS_MANIFEST, createRuleSemanticsPlugin);
  core.registerPlugin(WORLD_EVENTS_MANIFEST, createWorldEventsPlugin);
  core.registerPlugin(KNOWLEDGE_MANIFEST, createKnowledgePlugin);
  core.registerPlugin(AGENCY_MANIFEST, createAgencyPlugin);
  core.registerPlugin(SPATIAL_MANIFEST, createSpatialPlugin);
  core.registerPlugin(SENSES_MANIFEST, createSensesPlugin);
  core.registerPlugin(KIT_ADVENTURE_MANIFEST, createKitAdventurePlugin);
  core.registerPlugin(KIT_SOCIAL_MANIFEST, createKitSocialPlugin);
  core.registerPlugin(KIT_CHANNEL_MANIFEST, createKitChannelPlugin);
  core.registerPlugin(KIT_COMBAT_MANIFEST, createKitCombatPlugin);
  core.registerPlugin(KIT_PROSE_MANIFEST, createKitProsePlugin);
  core.registerPlugin(SIFT_MANIFEST, createSiftPlugin);
  core.registerPlugin(DRY_RUN_MANIFEST, createDryRunPlugin);
  core.registerPlugin(PROCESS_MANIFEST, createProcessPlugin);
  core.registerPlugin(CHAIN_MANIFEST, createChainPlugin);
  core.registerPlugin(LIFE_MANIFEST, createLifePlugin);
  core.registerPlugin(NLP_MANIFEST, createNlpPlugin);
  core.registerPlugin(IDE_UI_MANIFEST, createIdeUIPlugin);
  core.registerPlugin(IDE_GUIDE_MANIFEST, createIdeGuidePlugin);
  core.registerPlugin(IDE_SETTINGS_MANIFEST, createIdeSettingsPlugin);
  core.registerPlugin(ENTITY_EXTRAS_MANIFEST, createEntityExtrasPlugin);
  core.registerPlugin(MULTIPLAYER_MANIFEST, createMultiplayerPlugin);
  core.registerPlugin(EXT_HOST_MANIFEST, createExtHostPlugin);

  // Activate plugins respecting dependency graph
  await core.activatePlugin('lume-narrative-engine');
  await core.activatePlugin('lume-project-cloud');
  await core.activatePlugin('lume-ide-state');
  await core.activatePlugin('lume-intent-engine');
  await core.activatePlugin('lume-rule-semantics');
  await core.activatePlugin('lume-world-events');
  await core.activatePlugin('lume-knowledge');
  await core.activatePlugin('lume-agency');
  await core.activatePlugin('lume-spatial');
  await core.activatePlugin('lume-senses');
  await core.activatePlugin('lume-kit-adventure');
  await core.activatePlugin('lume-kit-social');
  await core.activatePlugin('lume-kit-channel');
  await core.activatePlugin('lume-kit-combat');
  await core.activatePlugin('lume-kit-prose');
  await core.activatePlugin('lume-sift');
  await core.activatePlugin('lume-dry-run');
  await core.activatePlugin('lume-process');
  await core.activatePlugin('lume-chain');
  await core.activatePlugin('lume-life');
  await core.activatePlugin('lume-nlp');
  await core.activatePlugin('lume-ide-ui');
  await core.activatePlugin('lume-ide-guide');
  await core.activatePlugin('lume-ide-settings');
  await core.activatePlugin('lume-entity-extras');
  await core.activatePlugin('lume-multiplayer');
  await core.activatePlugin('lume-ext-host');

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
    intentEngine: core.getService<IntentEngineService>('IntentEngine'),
    intentCatalog: core.getService<IntentCatalogService>('IntentCatalog'),
    ruleEffects: core.getService<RuleEffectsService>('RuleEffects'),
    ruleSemantics: core.getService<RuleSemanticsService>('RuleSemantics'),
    worldEvents: core.getService<WorldEventsService>('WorldEvents'),
    knowledge: core.getService<KnowledgeService>('Knowledge'),
    agency: core.getService<AgencyService>('Agency'),
    spatial: core.getService<SpatialService>('Spatial'),
    senses: core.getService<SensesService>('Senses'),
    adventureKit: core.getService<AdventureKitService>('AdventureKit'),
    socialKit: core.getService<SocialKitService>('SocialKit'),
    channelKit: core.getService<ChannelKitService>('ChannelKit'),
    combatKit: core.getService<CombatKitService>('CombatKit'),
    prose: core.getService<ProseService>('Prose'),
    sift: core.getService<SiftService>('Sift'),
    dryRun: core.getService<DryRunService>('DryRun'),
    process: core.getService<ProcessService>('Process'),
    chain: core.getService<ChainService>('Chain'),
    life: core.getService<LifeService>('Life'),
    nlp: core.getService<NlpService>('Nlp'),
    ideUI: core.getService<IdeUIService>('IdeUI'),
    ideComponents: core.getService<IdeComponentsService>('IdeComponents'),
    ideGuide: core.getService<IdeGuideService>('IdeGuide'),
    ideSettings: core.getService<IdeSettingsPluginService>('IdeSettingsService'),
    entityExtras: core.getService<EntityExtrasService>('EntityExtras'),
    multiplayer: core.getService<MultiplayerService>('Multiplayer'),
    extHost: core.getService<ExtHostService>('ExtHost')
  };
}

export function getLumeCore(): Core {
  if (!platformCore) {
    platformCore = createCore();
  }
  return platformCore;
}
