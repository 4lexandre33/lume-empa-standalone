/**
 * IDE View Registry & UI Helpers
 */

import type { IdeComponentsMap, MenuDefinition } from '../types.ts';
import type { Issue, SourceKind, HighlightSpan } from '../../narrative-engine/types.ts';
import { highlightSource } from '../../narrative-engine/lib/highlight.ts';
import { renderMarkdown } from '../../narrative-engine/lib/narrative.ts';

export const REGISTERED_VIEW_NAMES: (keyof IdeComponentsMap)[] = [
  'IdeApp',
  'SourceEditor',
  'PreviewPane',
  'ProjectTree',
  'Inspector',
  'TaxonomyPane',
  'Welcome',
  'Guide',
  'Reference',
  'ConfigPane',
  'Skein',
  'WorldMap',
  'BeatDebug',
  'WorldIndex',
  'PlaySkin',
  'NotebookPane'
];

const componentStore: Partial<IdeComponentsMap> = {};

export function registerViewComponent<K extends keyof IdeComponentsMap>(name: K, component: IdeComponentsMap[K]): void {
  componentStore[name] = component;
}

export function getViewComponent<K extends keyof IdeComponentsMap>(name: K): IdeComponentsMap[K] | null {
  return componentStore[name] ?? null;
}

export function getAllRegisteredViewNames(): string[] {
  return [...REGISTERED_VIEW_NAMES];
}

export const DEFAULT_MENUS: MenuDefinition[] = [
  { id: 'projeto', label: 'Projeto' },
  { id: 'editar', label: 'Editar' },
  { id: 'executar', label: 'Executar' },
  { id: 'depurar', label: 'Depurar' },
  { id: 'ajuda', label: 'Ajuda' }
];

export function formatIssueSummary(issues: Issue[]): { errors: number; warnings: number; text: string } {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  let text = 'Nenhum problema encontrado';
  if (errors > 0 && warnings > 0) {
    text = `${errors} erro${errors > 1 ? 's' : ''}, ${warnings} aviso${warnings > 1 ? 's' : ''}`;
  } else if (errors > 0) {
    text = `${errors} erro${errors > 1 ? 's' : ''}`;
  } else if (warnings > 0) {
    text = `${warnings} aviso${warnings > 1 ? 's' : ''}`;
  }

  return { errors, warnings, text };
}

export function renderMarkdownToHtml(markdown: string): string {
  return renderMarkdown(markdown);
}

export function highlightSourceSpans(source: string, kind: SourceKind): HighlightSpan[][] {
  return highlightSource(source, kind);
}
