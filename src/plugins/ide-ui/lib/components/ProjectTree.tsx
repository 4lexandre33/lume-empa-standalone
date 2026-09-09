import { useMemo } from "react";
import { ChevronRight, FileCode2, Flag, MapPin, Package, User, Sparkles, Zap, ScrollText, Shapes } from "lucide-react";
import { CATEGORY_LABEL, CATEGORY_TAGS, entityDisplayName, ruleSpecificity } from "../../../narrative-engine/lib/index.ts";
import { groupedEntities, useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";
import { cn } from "../utils.ts";

const TAG_ICON: Record<string, typeof MapPin> = {
  agent: User,
  object: Package,
  place: MapPin,
  event: Zap,
  information: ScrollText,
  abstract: Shapes,
};

export function ProjectTree() {
  const compiled = useIdeStore((s) => s.compiled);
  const selectedEntityId = useIdeStore((s) => s.selectedEntityId);
  const selectedRuleId = useIdeStore((s) => s.selectedRuleId);
  const insertEntity = useIdeStore((s) => s.insertEntity);
  const insertRule = useIdeStore((s) => s.insertRule);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const revealRule = useIdeStore((s) => s.revealRule);
  const groups = useMemo(() => groupedEntities(compiled), [compiled]);
  const rules = compiled?.rules ?? [];

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
          <div className="mb-3">
            <div className="mb-1 flex items-center gap-1 px-1 text-[10px] tracking-[0.14em] text-muted uppercase">
              <ChevronRight className="size-3" />
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
        {[...groups.entries()].map(([tag, ents]) => {
          const visible = ents.filter((e) => e.id !== "start");
          const Icon = TAG_ICON[tag] ?? Sparkles;
          const label = tag in CATEGORY_LABEL ? CATEGORY_LABEL[tag as keyof typeof CATEGORY_LABEL] : tag === "hidden" ? "Outros" : tag;
          if (tag === "hidden" && visible.length === 0) return null;
          return (
            <div key={tag} className="mb-3">
              <div className="mb-1 flex items-center gap-1 px-1 text-[10px] tracking-[0.14em] text-muted uppercase">
                <ChevronRight className="size-3" />
                {label}
              </div>
              {visible.length === 0 && (CATEGORY_TAGS as readonly string[]).includes(tag) ? (
                <p className="px-2 py-1 text-xs text-subtle">—</p>
              ) : (
                visible.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => revealEntity(e.id)}
                    className={cn("flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left", selectedEntityId === e.id ? "bg-elevated" : "hover:bg-surface")}
                  >
                    <Icon className="size-3.5 text-muted" />
                    <span className="truncate">{compiled ? entityDisplayName(compiled.worldModel, e.id) : e.id}</span>
                  </button>
                ))
              )}
            </div>
          );
        })}
        <div className="mb-1 mt-2 px-1 text-[10px] tracking-[0.14em] text-muted uppercase">Regras</div>
        {rules
          .slice()
          .sort((a: any, b: any) => ruleSpecificity(b, compiled?.taxonomy) - ruleSpecificity(a, compiled?.taxonomy) || a.index - b.index)
          .map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => revealRule(r.id)}
              className={cn("flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left", selectedRuleId === r.id ? "bg-elevated" : "hover:bg-surface")}
            >
              <FileCode2 className="size-3.5 text-muted" />
              <span className="truncate">{r.id}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
