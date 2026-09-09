import { useMemo } from "react";
import { GitBranch, ChevronRight } from "lucide-react";
import { entityDisplayName, impactOfTag, taxonomyForest, type TaxonomyNode } from "@/lib/engine/index.ts";
import { useIdeStore } from "@/lib/ide/store.ts";
import { SourceEditor } from "@/components/ide/SourceEditor.tsx";
import { cn } from "@/lib/utils.ts";

function TreeRows({ nodes, depth }: { nodes: TaxonomyNode[]; depth: number }) {
  const selectedTag = useIdeStore((s) => s.selectedTag);
  const revealTag = useIdeStore((s) => s.revealTag);
  return (
    <>
      {nodes.map((n) => (
        <div key={n.tag}>
          <button
            type="button"
            onClick={() => revealTag(n.tag)}
            className={cn(
              "flex w-full items-center gap-1 rounded-xs py-1 pr-2 text-left font-mono text-xs",
              selectedTag === n.tag ? "bg-elevated text-fg" : "text-syn-tag hover:bg-surface",
            )}
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            <ChevronRight className={cn("size-3 shrink-0 text-subtle", n.children.length ? "rotate-90" : "opacity-0")} />
            {n.tag}
          </button>
          {n.children.length ? <TreeRows nodes={n.children} depth={depth + 1} /> : null}
        </div>
      ))}
    </>
  );
}

export function TaxonomyPane({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const compiled = useIdeStore((s) => s.compiled);
  const game = useIdeStore((s) => s.game);
  const selectedTag = useIdeStore((s) => s.selectedTag);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const revealRule = useIdeStore((s) => s.revealRule);
  const world = game?.worldModel ?? compiled?.worldModel;
  const taxonomy = compiled?.taxonomy;
  const forest = useMemo(() => taxonomyForest(taxonomy), [taxonomy]);
  const impact = useMemo(() => {
    if (!selectedTag || !world || !compiled) return null;
    return impactOfTag(selectedTag, world, compiled.rules, taxonomy);
  }, [selectedTag, world, compiled, taxonomy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="min-h-0 min-w-0 flex-1">
        <SourceEditor kind="taxonomy" value={value} onChange={onChange} />
      </div>
      <aside className="flex max-h-48 min-h-32 shrink-0 flex-col overflow-hidden border-t border-border md:max-h-none md:w-64 md:border-t-0 md:border-l">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <GitBranch className="size-3 text-subtle" />
          <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Árvore</span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-1">
          {forest.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-relaxed text-subtle">Nenhuma herança. Uma linha: filho → pai.</p>
          ) : (
            <TreeRows nodes={forest} depth={0} />
          )}
        </div>
        <div className="border-t border-border px-3 py-2">
          <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Impacto</p>
          {!selectedTag ? (
            <p className="mt-1 text-xs text-subtle">Clique numa tag para ver quem herda e quais regras usam.</p>
          ) : impact ? (
            <div className="mt-1 space-y-1.5 text-xs">
              <p className="font-mono text-syn-tag">{selectedTag}</p>
              {impact.entitiesDirect.length + impact.entitiesInherited.length === 0 ? (
                <p className="text-subtle">Nenhuma entidade casa.</p>
              ) : (
                <ul className="space-y-0.5">
                  {impact.entitiesDirect.map((id) => (
                    <li key={id}>
                      <button type="button" onClick={() => revealEntity(id)} className="text-left text-fg hover:underline">
                        {world ? entityDisplayName(world, id) : id}
                      </button>
                      <span className="ml-1 text-subtle"> direta</span>
                    </li>
                  ))}
                  {impact.entitiesInherited.map((id) => (
                    <li key={id}>
                      <button type="button" onClick={() => revealEntity(id)} className="text-left text-muted hover:underline">
                        {world ? entityDisplayName(world, id) : id}
                      </button>
                      <span className="ml-1 text-subtle"> herda</span>
                    </li>
                  ))}
                </ul>
              )}
              {impact.rules.length ? (
                <ul className="space-y-0.5 border-t border-border pt-1.5">
                  {impact.rules.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => revealRule(r.id)} className="font-mono text-left text-muted hover:underline">
                        {r.id}
                      </button>
                      <span className="ml-1 text-subtle"> {r.role === "on" ? "ON" : "IF"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-subtle">Nenhuma regra cita esta tag.</p>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
