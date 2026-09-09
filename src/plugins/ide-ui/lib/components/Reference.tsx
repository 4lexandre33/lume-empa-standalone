import { X } from "lucide-react";
import { SYNTAX_REF } from "../../../ide-guide/lib/syntax-ref.ts";
import { Button } from "../ui/button.tsx";

export function Reference({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-stretch justify-end bg-bg/70" onMouseDown={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted uppercase">Ajuda</p>
            <h2 className="font-display text-2xl">Referência da linguagem</h2>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {SYNTAX_REF.map((s) => (
            <section key={s.id} className="mb-8">
              <h3 className="font-medium text-fg">{s.title}</h3>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))}
              {s.sample ? (
                <pre className="mt-3 overflow-auto rounded-xs border border-border bg-bg p-3 font-mono text-[12px] leading-5 text-fg">
                  {s.sample}
                </pre>
              ) : null}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
