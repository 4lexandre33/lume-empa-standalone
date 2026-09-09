/**
 * Project Cloud Plugin Capability Interfaces & Types
 */

import type { Project, ProjectIndexEntry, WireProject } from '../narrative-engine/lib/project.ts';

export type IdeSettings = {
  locale: string;
  onboarding: 'pending' | 'skipped' | 'done';
  layout: { left: number; right: number; bottom: number };
};

export interface PlaytestSnapshotRecord {
  projectId: string;
  snapshot: unknown;
  savedAt: string;
}

export interface ProjectVersionRecord {
  projectId: string;
  version: number;
  name: string;
  updatedAt: string;
  snapshot: WireProject;
}

export interface ProjectCloudService {
  listProjects(filters?: { search?: string }): Promise<ProjectIndexEntry[]>;
  loadProject(id: string): Promise<Project | null>;
  saveProject(project: WireProject | Project): Promise<ProjectIndexEntry>;
  deleteProject(id: string): Promise<{ ok: boolean }>;
  savePlaytest(projectId: string, snapshot: unknown): Promise<{ ok: boolean; savedAt: string }>;
  loadPlaytest(projectId: string): Promise<PlaytestSnapshotRecord | null>;
  deletePlaytest(projectId: string): Promise<{ ok: boolean }>;
  loadSettings(): Promise<IdeSettings>;
  saveSettings(settings: IdeSettings): Promise<IdeSettings>;
}

export interface ProjectHistoryService {
  listVersions(projectId: string): Promise<ProjectVersionRecord[]>;
  recordVersion(projectId: string, project: WireProject | Project): Promise<ProjectVersionRecord>;
  rollback(projectId: string, versionNumber: number): Promise<Project | null>;
}
