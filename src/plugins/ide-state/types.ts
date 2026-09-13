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
import type { IntentResolution, IntentSuggestion } from '../intent-engine/types.ts';
import type { SkeinNode, SessionJson } from '../narrative-engine/lib/index.ts';

export type EditorTab = 'entities' | 'taxonomy' | 'rules' | 'config';
export type IdeScreen = 'welcome' | 'ide' | 'guide' | 'play';
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
  skein: SkeinNode;
  skeinOpen: boolean;
  mapOpen: boolean;
  lastCommand: string | null;
  lastNotice: string | null;
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
  suggestCommands: (text: string) => IntentSuggestion[];
  resolveCommand: (text: string) => IntentResolution | null;
  executeCommand: (text: string) => boolean;
  rewindTo: (index: number) => void;
  rewindSkein: (triggerIds: string[]) => void;
  exportSessionJson: () => SessionJson | null;
  importSessionJson: (raw: unknown) => boolean;
  importPlayBundle: (raw: unknown) => boolean;
  consumeShareHash: () => boolean;
  setSkeinOpen: (open: boolean) => void;
  setMapOpen: (open: boolean) => void;
  openPlay: () => void;
  closePlay: () => void;
  insertEntity: () => string | null;
  insertRule: () => string | null;
  createSidebarFolder: (kind: "entities" | "rules", section: string) => string | null;
  renameSidebarFolder: (kind: "entities" | "rules", section: string, folderId: string, name: string) => void;
  deleteSidebarFolder: (kind: "entities" | "rules", section: string, folderId: string) => void;
  placeSidebarItem: (kind: "entities" | "rules", section: string, itemId: string, folderId: string | null) => void;
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
