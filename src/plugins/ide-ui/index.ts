/**
 * Lume IDE UI & Visual Components Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import {
  EntityInteractEvent,
  UserEditedSourceEvent,
  UserClickedPlayEvent,
  UserClickedRewindEvent
} from '../../core/contracts/typed-event.ts';

import { IDE_UI_MANIFEST } from './manifest.ts';
import type {
  IdeUIService,
  IdeComponentsService,
  IdeComponentsMap
} from './types.ts';
import {
  REGISTERED_VIEW_NAMES,
  DEFAULT_MENUS,
  formatIssueSummary,
  renderMarkdownToHtml,
  highlightSourceSpans,
  registerViewComponent,
  getViewComponent,
  getAllRegisteredViewNames
} from './lib/view-registry.ts';

export * from './manifest.ts';
export * from './types.ts';
export * from './lib/view-registry.ts';

export class IdeUIPlugin implements IPlugin {
  manifest: IPluginManifest = IDE_UI_MANIFEST;
  context: PluginContext;

  private ideUIService: IdeUIService;
  private ideComponentsService: IdeComponentsService;

  constructor(context: PluginContext) {
    this.context = context;

    // Build IDE UI Service capability
    this.ideUIService = {
      getComponent: <K extends keyof IdeComponentsMap>(name: K): IdeComponentsMap[K] | null => {
        return getViewComponent(name);
      },

      registerComponent: <K extends keyof IdeComponentsMap>(name: K, component: IdeComponentsMap[K]): void => {
        registerViewComponent(name, component);
      },

      listRegisteredViews: (): string[] => {
        return getAllRegisteredViewNames();
      },

      getAvailableMenus: () => {
        return DEFAULT_MENUS;
      },

      formatIssueSummary: (issues) => {
        return formatIssueSummary(issues);
      },

      renderMarkdownToHtml: (markdown) => {
        return renderMarkdownToHtml(markdown);
      },

      highlightSourceSpans: (source, kind) => {
        return highlightSourceSpans(source, kind);
      }
    };

    // Build IDE Components Service capability
    this.ideComponentsService = {
      getComponent: <K extends keyof IdeComponentsMap>(name: K) => {
        return getViewComponent(name);
      },
      registerComponent: <K extends keyof IdeComponentsMap>(name: K, component: IdeComponentsMap[K]) => {
        registerViewComponent(name, component);
      },
      listViews: () => {
        return [...REGISTERED_VIEW_NAMES];
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume IDE UI Plugin...');

    // 1. Register IdeUI capability
    this.context.registerCapability({
      name: 'IdeUI',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.ideUIService as any
    });

    // 2. Register IdeComponents capability
    this.context.registerCapability({
      name: 'IdeComponents',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.ideComponentsService as any
    });

    // 3. Register internal UI event bridges
    this.setupEventHandlers();

    if (this.manifest.hooks?.init) {
      await this.manifest.hooks.init();
    }

    this.context.logger.info('Lume IDE UI Plugin activated successfully with 2 capabilities.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Deactivating Lume IDE UI Plugin...');
    if (this.manifest.hooks?.destroy) {
      await this.manifest.hooks.destroy();
    }
    this.context.logger.info('Lume IDE UI Plugin deactivated.');
  }

  private setupEventHandlers(): void {
    // Listen for core compilation and game lifecycle events for UI telemetry
    this.context.on(EntityInteractEvent, (evt) => {
      this.context.logger.debug(`[UI] Entity interact dispatched for entity ${evt.data.entityId}`);
    });

    this.context.on(UserEditedSourceEvent, (evt) => {
      this.context.logger.debug(`[UI] User edited ${evt.data.sourceType} source in project ${evt.data.projectId}`);
    });

    this.context.on(UserClickedPlayEvent, (evt) => {
      this.context.logger.debug(`[UI] User triggered play preview for project ${evt.data.projectId}`);
    });

    this.context.on(UserClickedRewindEvent, (evt) => {
      this.context.logger.debug(`[UI] User rewound to turn ${evt.data.turnIndex} in project ${evt.data.projectId}`);
    });
  }

  getIdeUIService(): IdeUIService {
    return this.ideUIService;
  }

  getIdeComponentsService(): IdeComponentsService {
    return this.ideComponentsService;
  }
}

export function createIdeUIPlugin(context: PluginContext): IPlugin {
  return new IdeUIPlugin(context);
}
