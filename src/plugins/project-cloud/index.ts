/**
 * Lume Project Cloud Plugin
 * Extensible Microkernel Platform Architecture (EMPA) Plugin
 */

import type { IPlugin, IPluginManifest } from '../../core/contracts/plugin-manifest.ts';
import type { PluginContext } from '../../core/contracts/plugin-context.ts';
import {
  ProjectSavedEvent,
  ProjectLoadedEvent,
  ProjectDeletedEvent,
  PlaytestSavedEvent,
  PlaytestLoadedEvent,
  GameErrorEvent
} from '../../core/contracts/typed-event.ts';
import { PROJECT_CLOUD_MANIFEST } from './manifest.ts';
import type {
  ProjectCloudService,
  ProjectHistoryService,
  ProjectVersionRecord
} from './types.ts';
import {
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  savePlaytest,
  loadPlaytest,
  deletePlaytest,
  loadSettings,
  saveSettings
} from './lib/persistence.ts';
import { coerceProject, cloneProject } from '../narrative-engine/lib/project.ts';

export * from './manifest.ts';
export * from './types.ts';
export * from './lib/persistence.ts';

export class ProjectCloudPlugin implements IPlugin {
  manifest: IPluginManifest = PROJECT_CLOUD_MANIFEST;
  context: PluginContext;

  private projectCloudService: ProjectCloudService;
  private projectHistoryService: ProjectHistoryService;
  private versionHistory: Map<string, ProjectVersionRecord[]> = new Map();

  constructor(context: PluginContext) {
    this.context = context;

    // Build Project Cloud Service
    this.projectCloudService = {
      listProjects: async (filters) => {
        const list = await listProjects();
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          return list.filter((p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s));
        }
        return list;
      },

      loadProject: async (id: string) => {
        try {
          const project = await loadProject(id);
          if (project) {
            await this.context.emitEvent(
              new ProjectLoadedEvent({
                projectId: id,
                project: project as any
              })
            );
          }
          return project;
        } catch (err) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: id,
              error: err instanceof Error ? err.message : String(err),
              context: { operation: 'loadProject', id }
            })
          );
          throw err;
        }
      },

      saveProject: async (project) => {
        const p = coerceProject(project);
        try {
          const entry = await saveProject(p);
          await this.projectHistoryService.recordVersion(p.meta.id, p);

          await this.context.emitEvent(
            new ProjectSavedEvent({
              projectId: p.meta.id,
              version: p.meta.version,
              timestamp: Date.now()
            })
          );
          return entry;
        } catch (err) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: p.meta.id,
              error: err instanceof Error ? err.message : String(err),
              context: { operation: 'saveProject' }
            })
          );
          throw err;
        }
      },

      deleteProject: async (id: string) => {
        try {
          const res = await deleteProject(id);
          this.versionHistory.delete(id);

          await this.context.emitEvent(
            new ProjectDeletedEvent({
              projectId: id,
              timestamp: Date.now()
            })
          );
          return res;
        } catch (err) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId: id,
              error: err instanceof Error ? err.message : String(err),
              context: { operation: 'deleteProject', id }
            })
          );
          throw err;
        }
      },

      savePlaytest: async (projectId: string, snapshot: unknown) => {
        try {
          const res = await savePlaytest(projectId, snapshot);
          await this.context.emitEvent(
            new PlaytestSavedEvent({
              projectId,
              timestamp: Date.now()
            })
          );
          return res;
        } catch (err) {
          await this.context.emitEvent(
            new GameErrorEvent({
              projectId,
              error: err instanceof Error ? err.message : String(err),
              context: { operation: 'savePlaytest', projectId }
            })
          );
          throw err;
        }
      },

      loadPlaytest: async (projectId: string) => {
        const res = await loadPlaytest(projectId);
        if (res) {
          await this.context.emitEvent(
            new PlaytestLoadedEvent({
              projectId,
              snapshot: res.snapshot
            })
          );
        }
        return res;
      },

      deletePlaytest: async (projectId: string) => {
        return deletePlaytest(projectId);
      },

      loadSettings: async () => {
        return loadSettings();
      },

      saveSettings: async (settings) => {
        return saveSettings(settings);
      }
    };

    // Build Project History Service
    this.projectHistoryService = {
      listVersions: async (projectId: string) => {
        return this.versionHistory.get(projectId) ?? [];
      },

      recordVersion: async (projectId: string, project) => {
        const list = this.versionHistory.get(projectId) ?? [];
        const coerced = coerceProject(project);
        const record: ProjectVersionRecord = {
          projectId,
          version: list.length + 1,
          name: coerced.meta.name,
          updatedAt: coerced.meta.updatedAt,
          snapshot: cloneProject(coerced)
        };
        list.push(record);
        this.versionHistory.set(projectId, list);
        return record;
      },

      rollback: async (projectId: string, versionNumber: number) => {
        const list = this.versionHistory.get(projectId) ?? [];
        const match = list.find((v) => v.version === versionNumber);
        if (!match) return null;
        const restored = cloneProject(match.snapshot);
        await this.projectCloudService.saveProject(restored);
        return restored;
      }
    };
  }

  async activate(): Promise<void> {
    this.context.logger.info('Activating Lume Project Cloud Plugin...');

    // 1. Register ProjectCloud capability
    this.context.registerCapability({
      name: 'ProjectCloud',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.projectCloudService as any
    });

    // 2. Register ProjectHistory capability
    this.context.registerCapability({
      name: 'ProjectHistory',
      version: '1.0.0',
      provider: this.manifest.name,
      api: this.projectHistoryService as any
    });

    if (this.manifest.hooks?.init) {
      await this.manifest.hooks.init();
    }

    this.context.logger.info('Lume Project Cloud Plugin activated successfully with 2 capabilities.');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Deactivating Lume Project Cloud Plugin...');
    if (this.manifest.hooks?.destroy) {
      await this.manifest.hooks.destroy();
    }
    this.context.logger.info('Lume Project Cloud Plugin deactivated.');
  }

  getProjectCloud(): ProjectCloudService {
    return this.projectCloudService;
  }

  getProjectHistory(): ProjectHistoryService {
    return this.projectHistoryService;
  }
}

export function createProjectCloudPlugin(context: PluginContext): IPlugin {
  return new ProjectCloudPlugin(context);
}
