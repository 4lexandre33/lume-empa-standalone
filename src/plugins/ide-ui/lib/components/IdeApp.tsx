import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { BookOpen, GraduationCap, GitBranch } from "lucide-react";
import { ProjectTree } from "./ProjectTree.tsx";
import { SourceEditor } from "./SourceEditor.tsx";
import { PreviewPane } from "./PreviewPane.tsx";
import { Skein } from "./Skein.tsx";
import { WorldMap } from "./WorldMap.tsx";
import { Inspector } from "./Inspector.tsx";
import { ConfigPane } from "./ConfigPane.tsx";
import { TaxonomyPane } from "./TaxonomyPane.tsx";
import { Welcome } from "./Welcome.tsx";
import { Guide } from "./Guide.tsx";
import { Reference } from "./Reference.tsx";
import { WorldIndex } from "./WorldIndex.tsx";
import { PlaySkin } from "./PlaySkin.tsx";
import { ExtPluginsWindow } from "./ExtPluginsWindow.tsx";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { toWireProject, buildPlayBundle, encodeSessionHash } from "../../../narrative-engine/lib/index.ts";
import { staticPlayHtml, playShareUrl, sessionShareUrl } from "../play-html.ts";
import { cn } from "../utils.ts";
import { ensureExtHost } from "../../../ext-host/lib/ensure.ts";

type MenuId = "projeto" | "editar" | "executar" | "depurar" | "ajuda";

const MENUS: { id: MenuId; label: string }[] = [
  { id: "projeto", label: "Projeto" },
  { id: "editar", label: "Editar" },
  { id: "executar", label: "Executar" },
  { id: "depurar", label: "Depurar" },
  { id: "ajuda", label: "Ajuda" },
];

function MenuItem({
  label,
  kbd,
  onSelect,
  danger,
}: {
  label: string;
  kbd?: string;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-sm hover:bg-surface",
        danger ? "text-danger" : "text-fg",
      )}
    >
      <span>{label}</span>
      {kbd ? <span className="font-mono text-[10px] text-subtle">{kbd}</span> : null}
    </button>
  );
}

export function IdeApp() {
  const screen = useIdeStore((s) => s.screen);
  const project = useIdeStore((s) => s.project);
  const game = useIdeStore((s) => s.game);
  const tab = useIdeStore((s) => s.tab);
  const toast = useIdeStore((s) => s.toast);
  const busy = useIdeStore((s) => s.busy);
  const mobilePane = useIdeStore((s) => s.mobilePane);
  const inspectorOpen = useIdeStore((s) => s.inspectorOpen);
  const skeinOpen = useIdeStore((s) => s.skeinOpen);
  const mapOpen = useIdeStore((s) => s.mapOpen);
  const hydrate = useIdeStore((s) => s.hydrate);
  const booted = useIdeStore((s) => s.booted);
  const setTab = useIdeStore((s) => s.setTab);
  const setEntities = useIdeStore((s) => s.setEntities);
  const setTaxonomy = useIdeStore((s) => s.setTaxonomy);
  const setRules = useIdeStore((s) => s.setRules);
  const setMobilePane = useIdeStore((s) => s.setMobilePane);
  const setInspectorOpen = useIdeStore((s) => s.setInspectorOpen);
  const setSkeinOpen = useIdeStore((s) => s.setSkeinOpen);
  const setMapOpen = useIdeStore((s) => s.setMapOpen);
  const setToast = useIdeStore((s) => s.setToast);
  const saveNow = useIdeStore((s) => s.saveNow);
  const newBlank = useIdeStore((s) => s.newBlank);
  const openWelcome = useIdeStore((s) => s.openWelcome);
  const insertEntity = useIdeStore((s) => s.insertEntity);
  const insertRule = useIdeStore((s) => s.insertRule);
  const deleteSelected = useIdeStore((s) => s.deleteSelected);
  const deleteCurrent = useIdeStore((s) => s.deleteCurrent);
  const bootPreview = useIdeStore((s) => s.bootPreview);
  const resetPreview = useIdeStore((s) => s.resetPreview);
  const startGuide = useIdeStore((s) => s.startGuide);
  const importProject = useIdeStore((s) => s.importProject);
  const exportSessionJson = useIdeStore((s) => s.exportSessionJson);
  const importSessionJson = useIdeStore((s) => s.importSessionJson);
  const openPlay = useIdeStore((s) => s.openPlay);

  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [showRef, setShowRef] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [showExt, setShowExt] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    void ensureExtHost();
  }, []);

  useEffect(() => {
    const open = () => setShowExt(true);
    window.addEventListener("lume:open-ext-plugins", open);
    return () => window.removeEventListener("lume:open-ext-plugins", open);
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!openMenu) return;
      const node = e.target as Node | null;
      if (node && barRef.current?.contains(node)) return;
      setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setShowRef(false);
        setShowExt(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu, saveNow]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  function closeAnd(fn: () => void) {
    setOpenMenu(null);
    fn();
  }

  function exportJson() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(toWireProject(project), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.meta.name.replace(/\s+/g, "-").toLowerCase() || "historia"}.lume.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportSessionFile() {
    const session = exportSessionJson();
    if (!session || !project) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.meta.name.replace(/\s+/g, "-").toLowerCase() || "historia"}.sessao.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function slug() {
    return project?.meta.name.replace(/\s+/g, "-").toLowerCase() || "historia";
  }

  function exportPlayHtml() {
    if (!project) return;
    const bundle = buildPlayBundle(project, game);
    const url = playShareUrl(window.location.origin, window.location.pathname, bundle);
    const blob = new Blob([staticPlayHtml(bundle, url)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug()}.play.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copySessionLink() {
    const session = exportSessionJson();
    if (!session) {
      setToast("Sem sessão para partilhar.");
      return;
    }
    const url = sessionShareUrl(window.location.origin, window.location.pathname, encodeSessionHash(session));
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(
        () => setToast("Ligação da sessão copiada."),
        () => setToast(url),
      );
    } else setToast(url);
  }

  if (!booted) return <div className="min-h-dvh bg-bg" />;

  const chrome = (
    <>
      {toast ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-border bg-elevated px-3 py-2 text-sm shadow-xl">
          {toast}
        </div>
      ) : null}
      {busy ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/60 text-sm text-muted">{busy}</div>
      ) : null}
    </>
  );

  if (screen === "guide") {
    return (
      <>
        <Guide />
        {chrome}
      </>
    );
  }
  if (screen === "welcome") {
    return (
      <>
        <Welcome />
        {chrome}
      </>
    );
  }
  if (screen === "play") {
    return (
      <>
        <PlaySkin />
        {chrome}
      </>
    );
  }
  if (!project) {
    return (
      <>
        <Welcome />
        {chrome}
      </>
    );
  }

  const dirty = useIdeStore.getState().fingerprint !== useIdeStore.getState().savedFingerprint;

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <div ref={barRef} className="relative z-30 flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface px-2">
        <span className="mr-2 px-2 font-display text-lg leading-none">Lume</span>
        {MENUS.map((m) => (
          <div key={m.id} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === m.id}
              onClick={() => setOpenMenu((cur) => (cur === m.id ? null : m.id))}
              className={cn("h-8 rounded-xs px-2.5 text-sm", openMenu === m.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg")}
            >
              {m.label}
            </button>
            {openMenu === m.id ? (
              <div role="menu" className="absolute top-full left-0 z-40 mt-1 min-w-56 overflow-hidden rounded-sm border border-border bg-elevated py-1 shadow-2xl">
                {m.id === "projeto" ? (
                  <>
                    <MenuItem label="Nova história" onSelect={() => closeAnd(newBlank)} />
                    <MenuItem label="Abrir…" onSelect={() => closeAnd(openWelcome)} />
                    <MenuItem label="Guardar" kbd="⌘S" onSelect={() => closeAnd(saveNow)} />
                    <MenuItem label="Exportar JSON" onSelect={() => closeAnd(exportJson)} />
                    <MenuItem label="Importar JSON…" onSelect={() => closeAnd(() => fileRef.current?.click())} />
                    <div className="my-1 h-px bg-border" />
                    <MenuItem label="Apagar esta história" danger onSelect={() => closeAnd(deleteCurrent)} />
                  </>
                ) : null}
                {m.id === "editar" ? (
                  <>
                    <MenuItem label="Nova entidade" onSelect={() => closeAnd(() => insertEntity())} />
                    <MenuItem label="Nova regra" onSelect={() => closeAnd(() => insertRule())} />
                    <MenuItem label="Apagar selecionado" onSelect={() => closeAnd(deleteSelected)} />
                  </>
                ) : null}
                {m.id === "executar" ? (
                  <>
                    <MenuItem label="Jogar / ligar preview" onSelect={() => closeAnd(() => bootPreview(true))} />
                    <MenuItem label="Vista do jogador" onSelect={() => closeAnd(openPlay)} />
                    <MenuItem label="Recomeçar" onSelect={() => closeAnd(resetPreview)} />
                    <MenuItem
                      label={skeinOpen ? "Ocultar Skein" : "Mostrar Skein"}
                      onSelect={() => closeAnd(() => setSkeinOpen(!skeinOpen))}
                    />
                    <MenuItem label="Exportar play" onSelect={() => closeAnd(exportPlayHtml)} />
                    <MenuItem label="Exportar sessão" onSelect={() => closeAnd(exportSessionFile)} />
                    <MenuItem label="Copiar ligação da sessão" onSelect={() => closeAnd(copySessionLink)} />
                    <MenuItem label="Importar sessão…" onSelect={() => closeAnd(() => sessionRef.current?.click())} />
                  </>
                ) : null}
                {m.id === "depurar" ? (
                  <>
                    <MenuItem
                      label={inspectorOpen ? "Ocultar inspetor" : "Mostrar inspetor"}
                      onSelect={() =>
                        closeAnd(() => {
                          setInspectorOpen(!inspectorOpen);
                        })
                      }
                    />
                    <MenuItem
                      label={mapOpen ? "Ocultar mapa" : "Mostrar mapa"}
                      onSelect={() => closeAnd(() => setMapOpen(!mapOpen))}
                    />
                    <MenuItem label="Consulta *.place" onSelect={() => closeAnd(() => useIdeStore.getState().setInspectorQuery("*.place"))} />
                    <MenuItem label="Consulta *.object" onSelect={() => closeAnd(() => useIdeStore.getState().setInspectorQuery("*.object"))} />
                    <MenuItem label="Índice do mundo" onSelect={() => closeAnd(() => setShowIndex(true))} />
                  </>
                ) : null}
                {m.id === "ajuda" ? (
                  <>
                    <MenuItem label="Guia" onSelect={() => closeAnd(startGuide)} />
                    <MenuItem label="Referência da linguagem" onSelect={() => closeAnd(() => setShowRef(true))} />
                    <MenuItem label="Plugins externos…" onSelect={() => closeAnd(() => setShowExt(true))} />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        <span className="ml-auto truncate px-2 text-xs text-subtle">
          {project.meta.name}
          {dirty ? " ·" : ""}
        </span>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2 md:hidden">
        {(
          [
            ["tree", "Mundo"],
            ["editor", "Caderno"],
            ["play", "Jogo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            className={cn("h-8 rounded-xs px-3 text-sm", mobilePane === id ? "bg-elevated text-fg" : "text-muted")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 min-w-0 flex-1 md:flex">
          <Group orientation="vertical" className="h-full w-full">
            <Panel defaultSize={inspectorOpen || mapOpen ? "74" : "100"} minSize="40">
              <Group orientation="horizontal" className="h-full w-full">
                <Panel defaultSize="20" minSize="14" className="min-h-0">
                  <ProjectTree />
                </Panel>
                <Separator className="w-px bg-border" />
                <Panel defaultSize="52" minSize="30" className="min-h-0">
                  <EditorColumn tab={tab} setTab={setTab} project={project} setEntities={setEntities} setTaxonomy={setTaxonomy} setRules={setRules} />
                </Panel>
                <Separator className="w-px bg-border" />
                <Panel defaultSize="28" minSize="18" className="min-h-0">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1">
                      <PreviewPane />
                    </div>
                    {skeinOpen ? (
                      <div className="h-40 shrink-0 border-t border-border">
                        <Skein />
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </Group>
            </Panel>
            {inspectorOpen || mapOpen ? (
              <>
                <Separator className="h-px bg-border" />
                <Panel defaultSize="26" minSize="12" className="min-h-0">
                  {mapOpen && inspectorOpen ? (
                    <Group orientation="horizontal" className="h-full w-full">
                      <Panel defaultSize="50" minSize="20" className="min-h-0">
                        <WorldMap />
                      </Panel>
                      <Separator className="w-px bg-border" />
                      <Panel defaultSize="50" minSize="20" className="min-h-0">
                        <Inspector />
                      </Panel>
                    </Group>
                  ) : mapOpen ? (
                    <WorldMap />
                  ) : (
                    <Inspector />
                  )}
                </Panel>
              </>
            ) : null}
          </Group>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 md:hidden">
          {mobilePane === "tree" ? <ProjectTree /> : null}
          {mobilePane === "editor" ? (
            <EditorColumn tab={tab} setTab={setTab} project={project} setEntities={setEntities} setTaxonomy={setTaxonomy} setRules={setRules} />
          ) : null}
          {mobilePane === "play" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">
                <PreviewPane />
              </div>
              {skeinOpen ? (
                <div className="h-40 shrink-0 border-t border-border">
                  <Skein />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {mapOpen ? (
        <div className="absolute inset-x-0 bottom-0 z-20 h-[45%] border-t border-border md:hidden">
          <WorldMap />
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void f.text().then((t) => {
            try {
              importProject(JSON.parse(t));
            } catch {
              setToast("JSON inválido.");
            }
          });
        }}
      />
      <input
        ref={sessionRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void f.text().then((t) => {
            try {
              if (!importSessionJson(JSON.parse(t))) setToast("Sessão inválida.");
            } catch {
              setToast("JSON inválido.");
            }
          });
        }}
      />

      {showRef ? <Reference onClose={() => setShowRef(false)} /> : null}
      {showIndex ? <WorldIndex onClose={() => setShowIndex(false)} /> : null}
      {showExt ? <ExtPluginsWindow onClose={() => setShowExt(false)} /> : null}
      {chrome}
    </div>
  );
}

function EditorColumn({
  tab,
  setTab,
  project,
  setEntities,
  setTaxonomy,
  setRules,
}: {
  tab: "entities" | "taxonomy" | "rules" | "config";
  setTab: (t: "entities" | "taxonomy" | "rules" | "config") => void;
  project: { entitiesSource: string; taxonomySource: string; rulesSource: string };
  setEntities: (s: string) => void;
  setTaxonomy: (s: string) => void;
  setRules: (s: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        {(
          [
            ["entities", "Entidades"],
            ["taxonomy", "Taxonomia"],
            ["rules", "Regras"],
            ["config", "Config"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("h-7 rounded-xs px-2.5 text-sm", tab === id ? "bg-elevated text-fg" : "text-muted hover:text-fg")}
          >
            {label}
          </button>
        ))}
        {tab === "entities" ? (
          <span className="ml-auto hidden font-mono text-[10px] text-subtle sm:inline">MAIÚSCULAS + . + Enter monta o bloco</span>
        ) : null}
        {tab === "taxonomy" ? (
          <span className="ml-auto hidden items-center gap-1 font-mono text-[10px] text-subtle sm:flex">
            <GitBranch className="size-3" /> filho → pai · um pai só
          </span>
        ) : null}
        {tab === "rules" ? (
          <span className="ml-auto hidden items-center gap-1 font-mono text-[10px] text-subtle sm:flex">
            <BookOpen className="size-3" /> Tab confirma com espaço
          </span>
        ) : null}
        {tab === "config" ? (
          <span className="ml-auto hidden items-center gap-1 text-[10px] text-subtle sm:flex">
            <GraduationCap className="size-3" /> name não é tag
          </span>
        ) : null}
      </div>
      {tab === "entities" ? <SourceEditor kind="entities" value={project.entitiesSource} onChange={setEntities} /> : null}
      {tab === "taxonomy" ? <TaxonomyPane value={project.taxonomySource} onChange={setTaxonomy} /> : null}
      {tab === "rules" ? <SourceEditor kind="rules" value={project.rulesSource} onChange={setRules} /> : null}
      {tab === "config" ? <ConfigPane /> : null}
    </div>
  );
}
