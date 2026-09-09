/**
 * Lume IDE State & Orchestration Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { StoreApi } from 'zustand/vanilla';
import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import {
  ProjectCompiledEvent,
  GameCreatedEvent,
  GameBeatGeneratedEvent,
  ProjectSavedEvent,
  ProjectDeletedEvent,
  UserEditedSourceEvent,
  UserClickedRewindEvent
} from '../../core/contracts/typed-event.ts';

import { IDE_STATE_MANIFEST } from './manifest.ts';
import type {
  IdeStateService,
  IdeStore,
  IdeStateSnapshot
} from './types.ts';
import { createIdeZustandStore } from './lib/orchestrator.ts';
import type { Project, ProjectIndexEntry } from '../narrative-engine/types.ts';

export * from './manifest.ts';
export * from './types.ts';
export * from './lib/orchestrator.ts';

export class IdeStatePlugin implements IPlugin {
  manifest: IPluginManifest = IDE_STATE_MANIFEST;
  context: PluginContext;

  private store: StoreApi<IdeStore>;
  private ideStateService: IdeStateService;

  constructor(context: PluginContext) {
    this.context = context;

    // Initialize Zustand store connected to microkernel EventBus
    this.store = createIdeZustandStore(undefined, (eventName, payload) => {
      void this.handleStoreEvent(eventName, payload);
    });

    // Build IDE State Service capability
    this.ideStateService = {
      getState: (): IdeStateSnapshot => {
        const s = this.store.getState();
        return {
          ready: s.ready,
          booted: s.booted,
          busy: s.busy,
          screen: s.screen,
          project: s.project,
          fingerprint: s.fingerprint,
          savedFingerprint: s.savedFingerprint,
          compiled: s.compiled,
          issues: s.issues,
          game: s.game,
          tab: s.tab,
          selectedEntityId: s.selectedEntityId,
          selectedRuleId: s.selectedRuleId,
          selectedTag: s.selectedTag,
          sourceFocus: s.sourceFocus,
          settings: s.settings,
          catalog: s.catalog,
          toast: s.toast,
          inspectorQuery: s.inspectorQuery,
          inspectorMode: s.inspectorMode,
          mobilePane: s.mobilePane,
          inspectorOpen: s.inspectorOpen
        };
      },

      getStore: () => this.store,

      applyProject: (project: Project, _saved = false) => {
        const s = this.store.getState();
        s.setEntities(project.entitiesSource);
        s.setRules(project.rulesSource);
        s.setTaxonomy(project.taxonomySource);
        s.setName(project.meta.name);
        s.recompile();
        s.bootPreview(true);
      },

      recompile: () => {
        this.store.getState().recompile();
      },

      bootPreview: (force?: boolean) => {
        this.store.getState().bootPreview(force);
      },

      interact: (entityId: string) => {
        this.store.getState().interact(entityId);
      },

      rewindTo: (turnIndex: number) => {
        this.store.getState().rewindTo(turnIndex);
      },

      saveProject: async (): Promise<ProjectIndexEntry | null> => {
        const s = this.store.getState();
        if (!s.project) return null;
        s.saveNow();
        return {
          id: s.project.meta.id,
          name: s.project.meta.name,
          updatedAt: s.project.meta.updatedAt
        };
      },

      loadProject: async (id: string): Promise<Project | null> => {
        this.store.getState().openProject(id);
        return this.store.getState().project;
      },

      deleteProject: async (_id: string) => {
        this.store.getState().deleteCurrent();
      },

      subscribe: (listener: (state: IdeStore) => void) => {
        return this.store.subscribe(listener);
      }
    };
  }

  private async handleStoreEvent(eventName: string, payload: any): Promise<void> {
    try {
      switch (eventName) {
        case 'lume:user-edited-source':
          await this.context.emitEvent(
            new UserEditedSourceEvent({
              projectId: payload.projectId,
              sourceType: payload.sourceType,
              newSource: payload.newSource
            })
          );
          break;
        case 'lume:project-compiled':
          await this.context.emitEvent(
            new ProjectCompiledEvent({
              projectId: payload.projectId,
              result: {
                ok: payload.result.errors.length === 0,
                worldModel: payload.result.worldModel,
                rules: payload.result.rules,
                issues: [...payload.result.errors, ...payload.result.warnings],
                durationMs: 0
              },
              durationMs: 0
            })
          );
          break;
        case 'lume:game-created':
          await this.context.emitEvent(
            new GameCreatedEvent({
              projectId: payload.projectId,
              gameState: payload.gameState
            })
          );
          break;
        case 'lume:game-beat':
          await this.context.emitEvent(
            new GameBeatGeneratedEvent({
              projectId: payload.projectId,
              turn: payload.gameState.history.length,
              beat: payload.gameState.history[payload.gameState.history.length - 1] ?? {
                turn: 1,
                triggeredBy: '',
                narrative: '',
                changes: {},
                timestamp: Date.now()
              },
              gameState: payload.gameState
            })
          );
          break;
        case 'lume:user-clicked-rewind':
          await this.context.emitEvent(
            new UserClickedRewindEvent({
              projectId: payload.projectId,
              turnIndex: payload.turnIndex
            })
          );
          break;
        case 'lume:project-saved':
          await this.context.emitEvent(
            new ProjectSavedEvent({
              projectId: payload.projectId,
              version: 1,
              timestamp: Date.now()
            })
          );
          break;
        case 'lume:project-deleted':
          await this.context.emitEvent(
            new ProjectDeletedEvent({
              projectId: payload.projectId,
              timestamp: Date.now()
            })
          );
          break;
      }
    } catch (err) {
      this.context.logger.warn(`Failed to dispatch store event ${eventName}`, err as Error);
    }
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume IDE State Plugin...');

    // 1. Register IdeState capability
    this.context.registerCapability({
      name: 'IdeState',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.ideStateService as any
    });

    // 2. Register IdeStore capability
    this.context.registerCapability({
      name: 'IdeStore',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.ideStateService as any
    });

    if (this.manifest.hooks?.init) {
      await this.manifest.hooks.init();
    }

    this.context.logger.info('Lume IDE State Plugin activated successfully with 2 capabilities.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Deactivating Lume IDE State Plugin...');
    if (this.manifest.hooks?.destroy) {
      await this.manifest.hooks.destroy();
    }
    this.context.logger.info('Lume IDE State Plugin deactivated.');
  }

  getIdeStateService(): IdeStateService {
    return this.ideStateService;
  }
}

export function createIdeStatePlugin(context: PluginContext): IPlugin {
  return new IdeStatePlugin(context);
}
