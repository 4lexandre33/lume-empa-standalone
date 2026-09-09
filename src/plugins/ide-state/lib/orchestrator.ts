/**
 * IDE State Orchestrator & Zustand Store Engine
 */

import { createStore as createZustandStore, type StoreApi } from 'zustand/vanilla';
import type { Project, CompileProjectResult } from '../../narrative-engine/types.ts';
import type { IdeSettings } from '../../project-cloud/types.ts';
import {
  bootGame,
  coerceProject,
  createGame,
  createProject,
  diagnose,
  fingerprintProject,
  groupEntitiesByPrimaryTag,
  interactWith,
  newProjectId,
  resetGame,
  rewindTo as rewindGame
} from '../../narrative-engine/lib/index.ts';
import {
  deleteEntityBlock,
  deleteRuleBlock,
  insertEntity,
  insertRule,
  locateEntityBlock,
  locateRuleBlock
} from '../../narrative-engine/lib/source-ops.ts';
import {
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  loadSettings,
  saveSettings,
  DEFAULT_IDE_SETTINGS
} from '../../project-cloud/lib/persistence.ts';
import { readSessionDraft, writeSessionDraft } from './draft.ts';
import type { IdeStore, SourceFocus } from '../types.ts';

let compileTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let cloudChain: Promise<unknown> = Promise.resolve();
let loadGen = 0;

function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = cloudChain.then(fn, fn);
  cloudChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function fp(p: Project): string {
  return fingerprintProject(p);
}

function openWith(project: Project) {
  return {
    screen: 'ide' as const,
    project,
    fingerprint: fp(project),
    savedFingerprint: '',
    compiled: null,
    issues: [],
    game: null,
    tab: 'entities' as const,
    sourceFocus: null as SourceFocus | null,
    mobilePane: 'editor' as const,
    busy: null as string | null
  };
}

export function createIdeZustandStore(
  initialSettings: IdeSettings = DEFAULT_IDE_SETTINGS,
  onEventHook?: (eventName: string, payload: any) => void
): StoreApi<IdeStore> {
  return createZustandStore<IdeStore>((set, get) => {
    function remember() {
      const s = get();
      writeSessionDraft({
        project: s.project,
        screen: s.screen,
        tab: s.tab,
        onboarding: s.settings.onboarding
      });
    }

    function applyProject(project: Project, saved = false) {
      set({ ...openWith(project), savedFingerprint: saved ? fp(project) : '' });
      get().recompile();
      get().bootPreview(true);
      remember();
    }

    return {
      ready: true,
      booted: false,
      busy: null,
      screen: 'welcome',
      project: null,
      fingerprint: '',
      savedFingerprint: '',
      compiled: null,
      issues: [],
      game: null,
      tab: 'entities',
      selectedEntityId: null,
      selectedRuleId: null,
      selectedTag: null,
      sourceFocus: null,
      settings: initialSettings,
      catalog: [],
      toast: null,
      inspectorQuery: '',
      inspectorMode: 'effective',
      mobilePane: 'editor',
      inspectorOpen: true,

      hydrate: () => {
        const draft = readSessionDraft();
        if (draft?.project) {
          set({
            ...openWith(draft.project),
            tab: draft.tab,
            settings: { ...get().settings, onboarding: draft.onboarding },
            booted: true
          });
          get().recompile();
          get().bootPreview(true);
        } else if (draft) {
          set({
            settings: { ...get().settings, onboarding: draft.onboarding },
            screen: draft.screen === 'guide' ? 'guide' : 'welcome',
            booted: true
          });
        } else {
          set({ booted: true });
        }
        void (async () => {
          try {
            const [settings, catalog] = await queued(async () => {
              const [s, c] = await Promise.all([loadSettings(), listProjects()]);
              return [s, c] as const;
            });
            const localOnboarding = draft?.onboarding;
            const onboarding =
              localOnboarding === 'skipped' || localOnboarding === 'done' || settings.onboarding !== 'pending'
                ? (localOnboarding === 'pending' ? settings.onboarding : localOnboarding ?? settings.onboarding)
                : settings.onboarding;
            set({ ready: true, catalog, settings: { ...settings, onboarding } });
            remember();
          } catch {
            set({ ready: true });
          }
        })();
      },

      persist: () => {
        remember();
        const { project } = get();
        if (!project) return;
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => get().saveNow(), 700);
      },

      saveNow: () => {
        const p = get().project;
        if (!p) return;
        if (persistTimer) {
          clearTimeout(persistTimer);
          persistTimer = null;
        }
        remember();
        void queued(() => saveProject(p))
          .then(() => queued(() => listProjects()).then((catalog) => {
            set({ catalog, savedFingerprint: fp(p), toast: 'Guardado.' });
            if (onEventHook) onEventHook('lume:project-saved', { projectId: p.meta.id });
          }))
          .catch(() => set({ toast: 'Não foi possível guardar no servidor. O rascunho ficou neste navegador.' }));
      },

      recompile: () => {
        const { project } = get();
        if (!project) return;
        try {
          const { compiled, issues } = diagnose(project);
          set({ compiled, issues, fingerprint: fp(project) });
          if (onEventHook) onEventHook('lume:project-compiled', { projectId: project.meta.id, result: compiled });
        } catch (err) {
          set({
            fingerprint: fp(project),
            issues: [
              {
                code: 'E000',
                severity: 'error',
                message: err instanceof Error ? err.message : 'falha ao ler o caderno',
                location: { file: 'rules', line: 1 }
              }
            ]
          });
        }
      },

      bootPreview: (force) => {
        const { project, compiled, game } = get();
        if (!project || !compiled || compiled.errors.length) return;
        if (game && !force) return;
        try {
          const raw = createGame(compiled.worldModel, compiled.rules, project.settings.playerEntityId, compiled.taxonomy);
          const bootedState = bootGame(raw);
          set({ game: bootedState });
          if (onEventHook) onEventHook('lume:game-created', { projectId: project.meta.id, gameState: bootedState });
        } catch {
          set({ toast: 'O preview não ligou. Reveja as regras.' });
        }
      },

      resetPreview: () => {
        const { game } = get();
        if (!game) {
          get().bootPreview(true);
          return;
        }
        const resetState = resetGame(game);
        set({ game: resetState });
      },

      openWelcome: () => {
        set({ screen: 'welcome' });
        remember();
      },

      resume: () => {
        if (!get().project) return;
        set({ screen: 'ide' });
        remember();
      },

      newBlank: () => {
        get().dismissOnboarding();
        applyProject(createProject('Nova história'));
        get().persist();
      },

      openExample: (id) => {
        get().dismissOnboarding();
        // Create example project
        const project = createProject(id === 'planetarium' ? 'Planetário das Nove' : 'Caverna do Goblin');
        applyProject(project);
        get().persist();
      },

      openProject: (id) => {
        const gen = ++loadGen;
        set({ busy: 'Abrindo…' });
        void queued(() => loadProject(id))
          .then((loaded) => {
            if (gen !== loadGen) return;
            if (!loaded) {
              const draft = readSessionDraft();
              if (draft?.project?.meta.id === id) {
                applyProject(draft.project);
                return;
              }
              set({ busy: null, toast: 'História não encontrada.' });
              return;
            }
            applyProject(loaded, true);
          })
          .catch(() => {
            if (gen !== loadGen) return;
            const draft = readSessionDraft();
            if (draft?.project) {
              applyProject(draft.project);
              set({ toast: 'Servidor indisponível. Abri o rascunho local.' });
              return;
            }
            set({ toast: 'Não foi possível abrir a história.' });
          })
          .finally(() => {
            if (gen === loadGen) set({ busy: null });
          });
      },

      importProject: (raw) => {
        const project = coerceProject(raw);
        project.meta.id = newProjectId();
        get().dismissOnboarding();
        applyProject(project);
        get().persist();
      },

      startGuide: () => set({ screen: 'guide' }),

      dismissOnboarding: () => {
        if (get().settings.onboarding !== 'pending') return;
        const settings = { ...get().settings, onboarding: 'skipped' as const };
        set({ settings });
        remember();
        void queued(() => saveSettings(settings)).catch(() => undefined);
      },

      skipGuide: () => {
        get().dismissOnboarding();
        const { project } = get();
        set({ screen: project ? 'ide' : 'welcome' });
        remember();
      },

      setEntities: (source) => {
        const { project } = get();
        if (!project) return;
        set({ project: { ...project, entitiesSource: source }, tab: 'entities' });
        remember();
        if (onEventHook) onEventHook('lume:user-edited-source', { projectId: project.meta.id, sourceType: 'entities', newSource: source });
        if (compileTimer) clearTimeout(compileTimer);
        compileTimer = setTimeout(() => {
          get().recompile();
          get().persist();
        }, 280);
      },

      setTaxonomy: (source) => {
        const { project } = get();
        if (!project) return;
        set({ project: { ...project, taxonomySource: source }, tab: 'taxonomy' });
        remember();
        if (onEventHook) onEventHook('lume:user-edited-source', { projectId: project.meta.id, sourceType: 'taxonomy', newSource: source });
        if (compileTimer) clearTimeout(compileTimer);
        compileTimer = setTimeout(() => {
          get().recompile();
          get().persist();
        }, 280);
      },

      setRules: (source) => {
        const { project } = get();
        if (!project) return;
        set({ project: { ...project, rulesSource: source }, tab: 'rules' });
        remember();
        if (onEventHook) onEventHook('lume:user-edited-source', { projectId: project.meta.id, sourceType: 'rules', newSource: source });
        if (compileTimer) clearTimeout(compileTimer);
        compileTimer = setTimeout(() => {
          get().recompile();
          get().persist();
        }, 280);
      },

      setName: (name) => {
        const { project } = get();
        if (!project) return;
        set({ project: { ...project, meta: { ...project.meta, name } } });
        get().persist();
      },

      setPlayerId: (id) => {
        const { project } = get();
        if (!project) return;
        project.settings.playerEntityId = id.trim() || 'JOGADOR';
        set({ project: { ...project } });
        get().recompile();
        get().persist();
      },

      setExtra: (id, key, value) => {
        const { project } = get();
        if (!project) return;
        const extras = { ...project.extras, [id]: { ...(project.extras[id] ?? {}), [key]: value } };
        set({ project: { ...project, extras } });
        get().recompile();
        get().persist();
      },

      setTab: (tab) => {
        set({ tab });
        remember();
      },

      revealEntity: (id) => {
        const { project } = get();
        const loc = project ? locateEntityBlock(project.entitiesSource, id) : null;
        set({
          selectedEntityId: id,
          selectedRuleId: null,
          tab: 'entities',
          mobilePane: 'editor',
          sourceFocus: loc ? { file: 'entities', line: loc.startLine, nonce: Date.now() } : get().sourceFocus
        });
      },

      revealRule: (id) => {
        const { project } = get();
        const loc = project ? locateRuleBlock(project.rulesSource, id) : null;
        set({
          selectedRuleId: id,
          selectedEntityId: null,
          tab: 'rules',
          mobilePane: 'editor',
          sourceFocus: loc ? { file: 'rules', line: loc.startLine, nonce: Date.now() } : get().sourceFocus
        });
      },

      revealTag: (tag) => {
        const line = get().compiled?.taxonomy.declaredAt.get(tag) ?? 1;
        set({
          selectedTag: tag,
          tab: 'taxonomy',
          mobilePane: 'editor',
          sourceFocus: { file: 'taxonomy', line, nonce: Date.now() }
        });
      },

      focusSource: (file, line) => set({ sourceFocus: { file, line, nonce: Date.now() } }),

      interact: (id) => {
        const { game } = get();
        if (!game) return;
        try {
          const nextGame = interactWith(game, id);
          set({ game: nextGame });
          if (onEventHook) onEventHook('lume:game-beat', { projectId: game.playerEntityId, gameState: nextGame });
        } catch {
          set({ toast: 'Essa interação falhou.' });
        }
      },

      rewindTo: (index) => {
        const { game } = get();
        if (!game) return;
        const nextGame = rewindGame(game, index);
        set({ game: nextGame });
        if (onEventHook) onEventHook('lume:user-clicked-rewind', { projectId: game.playerEntityId, turnIndex: index });
      },

      insertEntity: () => {
        const { project } = get();
        if (!project) return null;
        const out = insertEntity(project.entitiesSource, 'NOVA');
        set({
          project: { ...project, entitiesSource: out.source },
          tab: 'entities',
          selectedEntityId: out.id,
          sourceFocus: { file: 'entities', line: out.line, nonce: Date.now() }
        });
        get().recompile();
        get().persist();
        return out.id;
      },

      insertRule: () => {
        const { project } = get();
        if (!project) return null;
        const out = insertRule(project.rulesSource, 'nova_regra');
        set({
          project: { ...project, rulesSource: out.source },
          tab: 'rules',
          selectedRuleId: out.id,
          sourceFocus: { file: 'rules', line: out.line, nonce: Date.now() }
        });
        get().recompile();
        get().persist();
        return out.id;
      },

      deleteSelected: () => {
        const { project, selectedEntityId, selectedRuleId } = get();
        if (!project) return;
        if (selectedEntityId) {
          const next = deleteEntityBlock(project.entitiesSource, selectedEntityId);
          if (next == null) return;
          set({ project: { ...project, entitiesSource: next }, selectedEntityId: null });
        } else if (selectedRuleId) {
          const next = deleteRuleBlock(project.rulesSource, selectedRuleId);
          if (next == null) return;
          set({ project: { ...project, rulesSource: next }, selectedRuleId: null });
        }
        get().recompile();
        get().persist();
      },

      deleteCurrent: () => {
        const { project } = get();
        if (!project) return;
        const id = project.meta.id;
        void queued(() => deleteProject(id))
          .then(() => queued(() => listProjects()))
          .then((catalog) => {
            set({ catalog, screen: 'welcome', project: null, game: null, compiled: null });
            remember();
            if (onEventHook) onEventHook('lume:project-deleted', { projectId: id });
          })
          .catch(() => set({ toast: 'Não foi possível apagar no servidor.' }));
      },

      setToast: (toast) => set({ toast }),
      setInspectorQuery: (inspectorQuery) => set({ inspectorQuery }),
      setInspectorMode: (inspectorMode) => set({ inspectorMode }),
      setLayout: (layout) => {
        const settings = { ...get().settings, layout };
        set({ settings });
        void queued(() => saveSettings(settings)).catch(() => undefined);
      },
      setMobilePane: (mobilePane) => set({ mobilePane }),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen })
    };
  });
}

import { useStore } from "zustand";

export const defaultIdeStoreInstance = createIdeZustandStore();

export interface UseIdeStoreHook {
  (): IdeStore;
  <U>(selector: (state: IdeStore) => U): U;
  getState: () => IdeStore;
  setState: typeof defaultIdeStoreInstance.setState;
  subscribe: typeof defaultIdeStoreInstance.subscribe;
  getInitialState: () => IdeStore;
}

export const useIdeStore: UseIdeStoreHook = Object.assign(
  function useIdeStoreHook<U>(selector?: (state: IdeStore) => U): any {
    return useStore(defaultIdeStoreInstance, (selector ?? ((s: IdeStore) => s as unknown as U)) as any);
  },
  {
    getState: defaultIdeStoreInstance.getState,
    setState: defaultIdeStoreInstance.setState,
    subscribe: defaultIdeStoreInstance.subscribe,
    getInitialState: defaultIdeStoreInstance.getInitialState
  }
);

export function groupedEntities(compiled: CompileProjectResult | null) {
  return groupEntitiesByPrimaryTag(compiled?.worldModel ?? new Map(), compiled?.taxonomy);
}
