import { useIdeStore } from "@/lib/ide/store.ts";

export function ConfigPane() {
  const project = useIdeStore((s) => s.project);
  const compiled = useIdeStore((s) => s.compiled);
  const setName = useIdeStore((s) => s.setName);
  const setPlayerId = useIdeStore((s) => s.setPlayerId);
  const setExtra = useIdeStore((s) => s.setExtra);
  const selectedEntityId = useIdeStore((s) => s.selectedEntityId);
  if (!project) return null;
  const entity = selectedEntityId && compiled ? compiled.worldModel.get(selectedEntityId) : undefined;
  const extras = selectedEntityId ? (project.extras[selectedEntityId] ?? {}) : {};

  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <h2 className="text-xs tracking-[0.14em] text-muted uppercase">História</h2>
      <label className="mt-3 block text-sm text-muted">Nome</label>
      <input
        value={project.meta.name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 h-10 w-full max-w-md rounded-xs border border-border bg-surface px-3 text-fg"
      />
      <label className="mt-4 block text-sm text-muted">Id do jogador</label>
      <input
        value={project.settings.playerEntityId}
        onChange={(e) => setPlayerId(e.target.value)}
        className="mt-1 h-10 w-full max-w-md rounded-xs border border-border bg-surface px-3 font-mono text-fg"
      />
      <p className="mt-2 max-w-md text-xs leading-relaxed text-subtle">
        current_location (em inglês) é o link que o preview consulta para saber onde o jogador está.
      </p>

      {entity ? (
        <section className="mt-8 max-w-md">
          <h2 className="text-xs tracking-[0.14em] text-muted uppercase">Propriedades visíveis · {entity.id}</h2>
          <p className="mt-2 text-sm text-subtle">
            name não é tag. É o texto que {`{${entity.id}.name}`} e {`{$.name}`} leem. Também pode ir no bloco, na linha name:.
          </p>
          <label className="mt-3 block text-sm text-muted">name</label>
          <input
            value={extras.name ?? entity.extra?.name ?? ""}
            onChange={(e) => setExtra(entity.id, "name", e.target.value)}
            className="mt-1 h-10 w-full rounded-xs border border-border bg-surface px-3 text-fg"
          />
          <label className="mt-3 block text-sm text-muted">description</label>
          <textarea
            value={extras.description ?? entity.extra?.description ?? ""}
            onChange={(e) => setExtra(entity.id, "description", e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 text-fg"
          />
        </section>
      ) : (
        <p className="mt-8 text-sm text-subtle">Selecione uma entidade na árvore para editar name e description.</p>
      )}
    </div>
  );
}
