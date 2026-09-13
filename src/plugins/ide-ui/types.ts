/**
 * IDE UI & Visual Components Plugin Capability Interfaces & Types
 */

import type React from 'react';
import type {
  Issue,
  HighlightSpan,
  SourceKind
} from '../narrative-engine/types.ts';

export type MenuId = 'projeto' | 'editar' | 'executar' | 'depurar' | 'ajuda';

export interface MenuItemDefinition {
  label: string;
  kbd?: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface MenuDefinition {
  id: MenuId;
  label: string;
  items?: MenuItemDefinition[];
}

export interface IdeComponentsMap {
  IdeApp: React.ComponentType;
  SourceEditor: React.ComponentType<{
    source: string;
    kind: SourceKind;
    onChange: (next: string) => void;
    issues?: Issue[];
    focusLine?: number | null;
    focusNonce?: number;
    className?: string;
  }>;
  PreviewPane: React.ComponentType;
  ProjectTree: React.ComponentType;
  Inspector: React.ComponentType;
  TaxonomyPane: React.ComponentType;
  Welcome: React.ComponentType;
  Guide: React.ComponentType;
  Reference: React.ComponentType<{ onClose: () => void }>;
  ConfigPane: React.ComponentType;
  Skein: React.ComponentType;
  WorldMap: React.ComponentType;
  BeatDebug: React.ComponentType;
  WorldIndex: React.ComponentType<{ onClose: () => void }>;
  PlaySkin: React.ComponentType;
  NotebookPane: React.ComponentType;
}

export interface IdeUIService {
  getComponent<K extends keyof IdeComponentsMap>(name: K): IdeComponentsMap[K] | null;
  registerComponent<K extends keyof IdeComponentsMap>(name: K, component: IdeComponentsMap[K]): void;
  listRegisteredViews(): string[];
  getAvailableMenus(): MenuDefinition[];
  formatIssueSummary(issues: Issue[]): { errors: number; warnings: number; text: string };
  renderMarkdownToHtml(markdown: string): string;
  highlightSourceSpans(source: string, kind: SourceKind): HighlightSpan[][];
}

export interface IdeComponentsService {
  getComponent<K extends keyof IdeComponentsMap>(name: K): IdeComponentsMap[K] | null;
  registerComponent<K extends keyof IdeComponentsMap>(name: K, component: IdeComponentsMap[K]): void;
  listViews(): string[];
}
