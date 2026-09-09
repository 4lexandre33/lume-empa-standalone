import { FilePlus, FolderOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { EXAMPLE_CATALOG } from "@/lib/engine/examples.ts";
import { useIdeStore } from "@/lib/ide/store.ts";

export function Welcome() {
  const catalog = useIdeStore((s) => s.catalog);
  const onboarding = useIdeStore((s) => s.settings.onboarding);
  const project = useIdeStore((s) => s.project);
  const newBlank = useIdeStore((s) => s.newBlank);
  const openExample = useIdeStore((s) => s.openExample);
  const openProject = useIdeStore((s) => s.openProject);
  const startGuide = useIdeStore((s) => s.startGuide);
  const skipGuide = useIdeStore((s) => s.skipGuide);
  const resume = useIdeStore((s) => s.resume);
  const pending = onboarding === "pending" && catalog.length === 0 && !project;

  return (
    <main className="relative z-10 flex min-h-dvh flex-col bg-bg px-5 py-10 sm:px-10">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs tracking-[0.22em] text-muted uppercase">Motor narrativo · IDE</p>
          <h1 className="mt-3 font-display text-6xl leading-none tracking-tight sm:text-7xl">Lume</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Histórias feitas de mundo e regras. Você descreve o que existe, o que acontece ao clicar, e o parágrafo que o leitor vê.
          </p>
        </div>
        <button type="button" onClick={startGuide} className="flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg">
          <GraduationCap className="size-4" />
          {pending ? "Nunca usei — ver o guia" : "Rever o guia"}
        </button>
      </header>

      {project ? (
        <section className="mx-auto mt-10 w-full max-w-5xl">
          <button
            type="button"
            onClick={resume}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border border-border bg-elevated px-4 text-left hover:bg-surface"
          >
            <span>
              <span className="block text-[10px] tracking-[0.14em] text-muted uppercase">Continuar</span>
              <span className="font-medium">{project.meta.name}</span>
            </span>
            <span className="text-sm text-subtle">voltar ao caderno</span>
          </button>
        </section>
      ) : null}

      {pending ? (
        <section className="mx-auto mt-10 grid w-full max-w-5xl gap-3 sm:grid-cols-2">
          <button type="button" onClick={startGuide} className="rounded-md border border-border bg-surface p-5 text-left hover:bg-elevated">
            <span className="block font-medium">Nunca usei a Lume</span>
            <span className="mt-2 block text-sm text-muted">O guia explica *, $, !, name, ciclos e o bloco de entidades.</span>
          </button>
          <button type="button" onClick={skipGuide} className="rounded-md border border-border bg-surface p-5 text-left hover:bg-elevated">
            <span className="block font-medium">Já sei, ou quero explorar</span>
            <span className="mt-2 block text-sm text-muted">Pula o ensinamento e vai para as histórias.</span>
          </button>
        </section>
      ) : null}

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <h2 className="text-xs tracking-[0.14em] text-muted uppercase">Histórias de exemplo</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {EXAMPLE_CATALOG.map((story) => (
            <li key={story.id}>
              <button
                type="button"
                onClick={() => openExample(story.id)}
                className="flex min-h-36 w-full flex-col items-start gap-2 rounded-md border border-border bg-surface p-4 text-left hover:bg-elevated"
              >
                <span className="text-xs tracking-[0.16em] text-subtle uppercase">{story.genre}</span>
                <span className="font-display text-2xl leading-tight">{story.name}</span>
                <span className="text-sm leading-relaxed text-muted">{story.blurb}</span>
                <span className="mt-auto pt-2 text-xs text-subtle">{story.teaches}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <Button variant="outline" onClick={newBlank}>
          <FilePlus className="size-4" /> Nova história
        </Button>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.14em] text-muted uppercase">
          <FolderOpen className="size-3.5" /> Histórias no servidor
        </div>
        {catalog.length === 0 ? (
          <p className="text-sm text-subtle">Nada salvo ainda.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {catalog.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => openProject(p.id)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left hover:bg-surface">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-xs text-subtle">{String(p.updatedAt ?? "").slice(0, 16).replace("T", " ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
