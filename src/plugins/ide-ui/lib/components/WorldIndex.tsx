import { buildWorldIndex } from "../../../narrative-engine/lib/world-index.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";
import { X } from "lucide-react";

function Section({
  title,
  ids,
  onPick,
}: {
  title: string;
  ids: readonly string[];
  onPick?: (id: string) => void;
}) {
  return (
    <section className="mb-5">
      <h3 className="text-[10px] tracking-[0.14em] text-muted uppercase">{title}</h3>
      {ids.length === 0 ? (
        <p className="mt-1 text-sm text-subtle">(nenhum)</p>
      ) : (
        <ul className="mt-1">
          {ids.map((id) => (
            <li key={id}>
              {onPick ? (
                <button type="button" className="font-mono text-[12px] text-fg hover:underline" onClick={() => onPick(id)}>
                  {id}
                </button>
              ) : (
                <span className="font-mono text-[12px] text-fg">{id}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WorldIndex({ onClose }: { onClose: () => void }) {
  const compiled = useIdeStore((s) => s.compiled);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const revealRule = useIdeStore((s) => s.revealRule);
  const index = compiled
    ? buildWorldIndex(compiled.worldModel, compiled.rules, compiled.patterns, compiled.taxonomy)
    : null;

  return (
    <div className="absolute inset-0 z-40 flex items-stretch justify-end bg-bg/70" onMouseDown={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted uppercase">Mundo</p>
            <h2 className="font-display text-2xl">Índice</h2>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {!index ? (
            <p className="text-sm text-muted">Compile o caderno para gerar o índice.</p>
          ) : (
            <>
              <Section title="Salas" ids={index.places} onPick={revealEntity} />
              <Section title="Objectos" ids={index.objects} onPick={revealEntity} />
              <Section title="Agentes" ids={index.agents} onPick={revealEntity} />
              <section className="mb-5">
                <h3 className="text-[10px] tracking-[0.14em] text-muted uppercase">Regras</h3>
                {index.rules.length === 0 ? (
                  <p className="mt-1 text-sm text-subtle">(nenhuma)</p>
                ) : (
                  <ul className="mt-1">
                    {index.rules.map((rule) => (
                      <li key={rule.id}>
                        <button type="button" className="font-mono text-[12px] text-fg hover:underline" onClick={() => revealRule(rule.id)}>
                          {rule.id}
                        </button>
                        <span className="ml-2 font-mono text-[11px] text-subtle">ON: {rule.on}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <Section title="Traits" ids={index.tags} />
              <Section title="Canais" ids={index.channels} onPick={revealEntity} />
              <Section title="Padrões" ids={index.patterns} />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
