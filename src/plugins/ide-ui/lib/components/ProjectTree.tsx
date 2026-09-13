import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  ChevronRight,
  FileCode2,
  Flag,
  Folder,
  FolderPlus,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  ScrollText,
  Shapes,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { entityDisplayName, ruleSpecificity, type Entity, type Rule, type SidebarBucket } from "../../../narrative-engine/lib/index.ts";
import {
  ENTITY_SECTIONS,
  ENTITY_SECTION_LABEL,
  RULE_SECTIONS,
  RULE_SECTION_LABEL,
  entitiesBySection,
  rulesBySection,
  type EntitySection,
  type RuleSection,
  type TreeKind,
} from "../../../ide-state/lib/tree.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";
import { cn } from "../utils.ts";

const TAG_ICON: Record<string, typeof MapPin> = {
  agent: User,
  object: Package,
  place: MapPin,
  event: Zap,
  information: ScrollText,
  abstract: Shapes,
  other: MoreHorizontal,
};

type MenuState = { kind: TreeKind; section: string; itemId: string } | null;

function emptyBucket(): SidebarBucket {
  return { folders: [], placements: {} };
}

function HeaderRow({
  open,
  onToggle,
  label,
  depth,
  actions,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  depth: number;
  actions?: ReactNode;
}) {
  return (
    <div className="group mb-0.5 flex items-center gap-1 rounded-xs px-1 py-1 hover:bg-surface/60" style={{ paddingLeft: 4 + depth * 10 }}>
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1 text-left">
        <ChevronRight className={cn("size-3 shrink-0 text-subtle transition-transform", open && "rotate-90")} />
        <span className="truncate text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{label}</span>
      </button>
      {actions ? <div className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">{actions}</div> : null}
    </div>
  );
}

function TinyIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="inline-flex size-5 items-center justify-center rounded-xs text-subtle hover:bg-elevated hover:text-fg"
    >
      {children}
    </button>
  );
}

export function ProjectTree() {
  const compiled = useIdeStore((s) => s.compiled);
  const project = useIdeStore((s) => s.project);
  const selectedEntityId = useIdeStore((s) => s.selectedEntityId);
  const selectedRuleId = useIdeStore((s) => s.selectedRuleId);
  const insertEntity = useIdeStore((s) => s.insertEntity);
  const insertRule = useIdeStore((s) => s.insertRule);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const revealRule = useIdeStore((s) => s.revealRule);
  const createSidebarFolder = useIdeStore((s) => s.createSidebarFolder);
  const renameSidebarFolder = useIdeStore((s) => s.renameSidebarFolder);
  const deleteSidebarFolder = useIdeStore((s) => s.deleteSidebarFolder);
  const placeSidebarItem = useIdeStore((s) => s.placeSidebarItem);

  const [open, setOpen] = useState<Record<string, boolean>>({
    entities: true,
    rules: true,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const entityGroups = useMemo(
    () => entitiesBySection(compiled?.worldModel ?? new Map(), compiled?.taxonomy),
    [compiled],
  );
  const ruleGroups = useMemo(() => {
    const grouped = rulesBySection(compiled?.rules ?? []);
    for (const section of RULE_SECTIONS) {
      grouped[section] = grouped[section]
        .slice()
        .sort((a, b) => ruleSpecificity(b, compiled?.taxonomy) - ruleSpecificity(a, compiled?.taxonomy) || a.index - b.index);
    }
    return grouped;
  }, [compiled]);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const tree = project?.settings.tree;
  const isOpen = (key: string, fallback = true) => open[key] ?? fallback;
  const toggle = (key: string, fallback = true) => setOpen((prev) => ({ ...prev, [key]: !(prev[key] ?? fallback) }));

  const startEdit = (folderId: string, name: string) => {
    setEditing(folderId);
    setDraft(name);
  };

  const commitEdit = (kind: TreeKind, section: string, folderId: string) => {
    const name = draft.trim();
    if (name) renameSidebarFolder(kind, section, folderId, name);
    setEditing(null);
  };

  const onCreateFolder = (kind: TreeKind, section: string) => {
    const id = createSidebarFolder(kind, section);
    if (!id) return;
    toggle(`${kind}:${section}`, true);
    startEdit(id, "Nova pasta");
  };

  const renderItems = (
    kind: TreeKind,
    section: string,
    items: { id: string; label: string; selected: boolean; onOpen: () => void; Icon: typeof MapPin }[],
    bucket: SidebarBucket,
    depth: number,
  ) => {
    const placed = new Set(Object.keys(bucket.placements));
    const loose = items.filter((item) => !placed.has(item.id) || !bucket.folders.some((folder) => folder.id === bucket.placements[item.id]));
    return (
      <>
        {bucket.folders.map((folder) => {
          const key = `${kind}:${section}:${folder.id}`;
          const kids = items.filter((item) => bucket.placements[item.id] === folder.id);
          return (
            <div key={folder.id}>
              <div
                className="group flex items-center gap-1 rounded-xs py-1 hover:bg-surface/60"
                style={{ paddingLeft: 4 + depth * 10 }}
              >
                <button type="button" onClick={() => toggle(key)} className="flex min-w-0 flex-1 items-center gap-1 text-left">
                  <ChevronRight className={cn("size-3 shrink-0 text-subtle transition-transform", isOpen(key) && "rotate-90")} />
                  <Folder className="size-3.5 shrink-0 text-muted" />
                  {editing === folder.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => commitEdit(kind, section, folder.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitEdit(kind, section, folder.id);
                        if (event.key === "Escape") setEditing(null);
                      }}
                      className="min-w-0 flex-1 rounded-xs border border-border bg-elevated px-1 py-0.5 text-xs text-fg outline-none"
                    />
                  ) : (
                    <span className="truncate text-xs text-fg">{folder.name}</span>
                  )}
                </button>
                <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <TinyIconButton title="Renomear pasta" onClick={() => startEdit(folder.id, folder.name)}>
                    <Pencil className="size-3" />
                  </TinyIconButton>
                  <TinyIconButton title="Apagar pasta" onClick={() => deleteSidebarFolder(kind, section, folder.id)}>
                    <Trash2 className="size-3" />
                  </TinyIconButton>
                </div>
              </div>
              {isOpen(key)
                ? kids.map((item) => renderLeaf(kind, section, item, bucket, depth + 1))
                : null}
            </div>
          );
        })}
        {loose.map((item) => renderLeaf(kind, section, item, bucket, depth))}
      </>
    );
  };

  const renderLeaf = (
    kind: TreeKind,
    section: string,
    item: { id: string; label: string; selected: boolean; onOpen: () => void; Icon: typeof MapPin },
    bucket: SidebarBucket,
    depth: number,
  ) => (
    <div key={item.id} className="relative">
      <button
        type="button"
        onClick={item.onOpen}
        onContextMenu={(event) => {
          if (!bucket.folders.length) return;
          event.preventDefault();
          setMenu({ kind, section, itemId: item.id });
        }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-xs py-1.5 pr-2 text-left",
          item.selected ? "bg-elevated" : "hover:bg-surface",
        )}
        style={{ paddingLeft: 8 + depth * 10 }}
      >
        <item.Icon className="size-3.5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
        {bucket.folders.length > 0 ? (
          <span
            className="text-[10px] text-subtle opacity-0 hover:text-fg group-hover:opacity-100"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu({ kind, section, itemId: item.id });
            }}
          >
            ···
          </span>
        ) : null}
      </button>
      {menu?.kind === kind && menu.section === section && menu.itemId === item.id ? (
        <div
          ref={menuRef}
          className="absolute right-1 z-30 mt-0.5 min-w-36 rounded-sm border border-border bg-elevated py-1 shadow-md"
        >
          <p className="px-2 pb-1 text-[10px] tracking-[0.12em] text-subtle uppercase">Mover para</p>
          <button
            type="button"
            className="block w-full px-2 py-1 text-left text-xs hover:bg-surface"
            onClick={() => {
              placeSidebarItem(kind, section, item.id, null);
              setMenu(null);
            }}
          >
            Raiz
          </button>
          {bucket.folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="block w-full px-2 py-1 text-left text-xs hover:bg-surface"
              onClick={() => {
                placeSidebarItem(kind, section, item.id, folder.id);
                setMenu(null);
              }}
            >
              {folder.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderEntitySection = (section: EntitySection) => {
    const ents = entityGroups[section] ?? [];
    const Icon = TAG_ICON[section] ?? Sparkles;
    const bucket = tree?.entities[section] ?? emptyBucket();
    const key = `entities:${section}`;
    const items = ents.map((entity: Entity) => ({
      id: entity.id,
      label: compiled ? entityDisplayName(compiled.worldModel, entity.id) : entity.id,
      selected: selectedEntityId === entity.id,
      onOpen: () => revealEntity(entity.id),
      Icon,
    }));
    return (
      <div key={section} className="mb-0.5">
        <HeaderRow
          open={isOpen(key)}
          onToggle={() => toggle(key)}
          label={ENTITY_SECTION_LABEL[section]}
          depth={1}
          actions={
            <TinyIconButton title="Nova pasta" onClick={() => onCreateFolder("entities", section)}>
              <FolderPlus className="size-3" />
            </TinyIconButton>
          }
        />
        {isOpen(key) ? renderItems("entities", section, items, bucket, 2) : null}
      </div>
    );
  };

  const renderRuleSection = (section: RuleSection) => {
    const list = ruleGroups[section] ?? [];
    const bucket = tree?.rules[section] ?? emptyBucket();
    const key = `rules:${section}`;
    const items = list.map((rule: Rule) => ({
      id: rule.id,
      label: rule.id,
      selected: selectedRuleId === rule.id,
      onOpen: () => revealRule(rule.id),
      Icon: FileCode2,
    }));
    return (
      <div key={section} className="mb-0.5">
        <HeaderRow
          open={isOpen(key)}
          onToggle={() => toggle(key)}
          label={RULE_SECTION_LABEL[section]}
          depth={1}
          actions={
            <TinyIconButton title="Nova pasta" onClick={() => onCreateFolder("rules", section)}>
              <FolderPlus className="size-3" />
            </TinyIconButton>
          }
        />
        {isOpen(key) ? renderItems("rules", section, items, bucket, 2) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">Projeto</span>
        <div className="flex">
          <Button size="icon-sm" variant="ghost" title="Nova entidade" onClick={() => insertEntity()}>
            <Package />
          </Button>
          <Button size="icon-sm" variant="ghost" title="Nova regra" onClick={() => insertRule()}>
            <FileCode2 />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2 text-sm">
        {compiled?.worldModel.has("start") ? (
          <div className="mb-2">
            <div className="mb-1 flex items-center gap-1 px-1 text-[10px] tracking-[0.14em] text-muted uppercase">
              Início
            </div>
            <button
              type="button"
              onClick={() => revealEntity("start")}
              className={cn("flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left", selectedEntityId === "start" ? "bg-elevated" : "hover:bg-surface")}
            >
              <Flag className="size-3.5 text-muted" />
              <span className="truncate font-mono text-xs">start()</span>
            </button>
          </div>
        ) : null}

        <HeaderRow open={isOpen("entities")} onToggle={() => toggle("entities")} label="Entities" depth={0} />
        {isOpen("entities") ? ENTITY_SECTIONS.map(renderEntitySection) : null}

        <div className="mt-2">
          <HeaderRow open={isOpen("rules")} onToggle={() => toggle("rules")} label="Rules" depth={0} />
          {isOpen("rules") ? RULE_SECTIONS.map(renderRuleSection) : null}
        </div>
      </div>
    </div>
  );
}
