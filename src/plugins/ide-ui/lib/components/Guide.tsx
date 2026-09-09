import { useState } from "react";
import { GUIDE_SLIDES } from "../../../ide-guide/lib/guide.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";

export function Guide() {
  const [i, setI] = useState(0);
  const skipGuide = useIdeStore((s) => s.skipGuide);
  const openExample = useIdeStore((s) => s.openExample);
  const slide = GUIDE_SLIDES[i]!;
  const last = i === GUIDE_SLIDES.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <p className="text-xs tracking-[0.22em] text-muted uppercase">{slide.kicker}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight">{slide.title}</h1>
      <div className="mt-6 space-y-3 text-base leading-relaxed text-muted">
        {slide.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {slide.sample ? (
        <pre className="mt-6 overflow-auto rounded-md border border-border bg-surface p-4 font-mono text-sm leading-6 text-fg">
          <p className="mb-2 text-[10px] tracking-[0.14em] text-subtle uppercase">{slide.sample.label}</p>
          {slide.sample.code}
        </pre>
      ) : null}
      <footer className="mt-10 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={skipGuide}>
          Pular
        </Button>
        {i > 0 ? (
          <Button variant="outline" onClick={() => setI(i - 1)}>
            Anterior
          </Button>
        ) : null}
        {last ? (
          <Button
            variant="default"
            onClick={() => openExample("planetarium")}
          >
            Abrir o planetário
          </Button>
        ) : (
          <Button variant="default" onClick={() => setI(i + 1)}>
            Seguinte
          </Button>
        )}
        <span className="ml-auto font-mono text-xs text-subtle">
          {i + 1}/{GUIDE_SLIDES.length}
        </span>
      </footer>
    </main>
  );
}
