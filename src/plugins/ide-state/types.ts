/**
 * IDE State & Orchestration Plugin Capability Interfaces & Types
 */

import type {
  Project,
  CompileProjectResult,
  GameState,
  Issue,
  ProjectIndexEntry,
  TagMatchMode
} from '../narrative-engine/types.ts';
import type { IdeSettings } from '../project-cloud/types.ts';

export type EditorTab = 'entities' | 'taxonomy' | 'rules' | 'config';
export type IdeScreen = 'welcome' | 'ide' | 'guide';
export type MobilePane = 'tree' | 'editor' | 'play';

export interface SourceFocus {
  file: 'entities' | 'rules' | 'taxonomy';
  line: number;
  nonce: number;
}

export interface IdeStateSnapshot {
  ready: boolean;
  booted: boolean;
  busy: string | null;
  screen: IdeScreen;
  project: Project | null;
  fingerprint: string;
  savedFingerprint: string;
  compiled: CompileProjectResult | null;
  issues: Issue[];
  game: GameState | null;
  tab: EditorTab;
  selectedEntityId: string | null;
  selectedRuleId: string | null;
  selectedTag: string | null;
  sourceFocus: SourceFocus | null;
  settings: IdeSettings;
  catalog: ProjectIndexEntry[];
  toast: string | null;
  inspectorQuery: string;
  inspectorMode: TagMatchMode;
  mobilePane: MobilePane;
  inspectorOpen: boolean;
}

export interface IdeStoreActions {
  hydrate: () => void;
  persist: () => void;
  saveNow: () => void;
  recompile: () => void;
  bootPreview: (force?: boolean) => void;
  resetPreview: () => void;
  openWelcome: () => void;
  resume: () => void;
  newBlank: () => void;
  openExample: (id: string) => void;
  openProject: (id: string) => void;
  importProject: (raw: unknown) => void;
  startGuide: () => void;
  skipGuide: () => void;
  dismissOnboarding: () => void;
  setEntities: (source: string) => void;
  setTaxonomy: (source: string) => void;
  setRules: (source: string) => void;
  setName: (name: string) => void;
  setPlayerId: (id: string) => void;
  setExtra: (id: string, key: string, value: string) => void;
  setTab: (tab: EditorTab) => void;
  revealEntity: (id: string) => void;
  revealRule: (id: string) => void;
  revealTag: (tag: string) => void;
  focusSource: (file: 'entities' | 'rules' | 'taxonomy', line: number) => void;
  interact: (id: string) => void;
  rewindTo: (index: number) => void;
  insertEntity: () => string | null;
  insertRule: () => string | null;
  deleteSelected: () => void;
  deleteCurrent: () => void;
  setToast: (msg: string | null) => void;
  setInspectorQuery: (q: string) => void;
  setInspectorMode: (mode: TagMatchMode) => void;
  setLayout: (layout: IdeSettings['layout']) => void;
  setMobilePane: (pane: MobilePane) => void;
  setInspectorOpen: (open: boolean) => void;
}

export type IdeStore = IdeStateSnapshot & IdeStoreActions;

export interface IdeStateService {
  getState(): IdeStateSnapshot;
  getStore(): import('zustand').StoreApi<IdeStore>;
  applyProject(project: Project, saved?: boolean): void;
  recompile(): void;
  bootPreview(force?: boolean): void;
  interact(entityId: string): void;
  rewindTo(turnIndex: number): void;
  saveProject(): Promise<ProjectIndexEntry | null>;
  loadProject(id: string): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;
  subscribe(listener: (state: IdeStore) => void): () => void;
}
