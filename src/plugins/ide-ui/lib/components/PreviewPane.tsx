import { RotateCcw, Undo2 } from "lucide-react";
import { entityDisplayName, explainMatcher, listChoiceGroups, renderMarkdown } from "../../../narrative-engine/lib/index.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";

export function PreviewPane() {
  const game = useIdeStore((s) => s.game);
  const compiled = useIdeStore((s) => s.compiled);
  const interact = useIdeStore((s) => s.interact);
  const bootPreview = useIdeStore((s) => s.bootPreview);
  const resetPreview = useIdeStore((s) => s.resetPreview);
  const rewindTo = useIdeStore((s) => s.rewindTo);
  const world = game?.worldModel ?? compiled?.worldModel;

  if (!game) {
    return (
      <div className="flex h-full flex-col items-start gap-3 p-4">
        <p className="text-sm text-muted">O preview ainda não ligou.</p>
        <Button variant="default" onClick={() => bootPreview(true)}>
          Jogar
        </Button>
      </div>
    );
  }

  const groups = listChoiceGroups(game);
  const last = game.history.length - 1;
  const why =
    game.lastRule && game.lastInteractionId
      ? explainMatcher(game.lastRule.trigger, game.lastInteractionId, game.worldModel, game.lastInteractionId, game.taxonomy)
      : null;
  const via = why?.clauses.find((c) => c.path && c.path.length > 1)?.path?.join(" → ");

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Preview</span>
        <Button size="icon-sm" variant="ghost" title="Recomeçar" aria-label="Recomeçar" onClick={resetPreview} className="size-11">
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {game.history.map((beat: any, i: number) => (
          <div key={`${beat.timestamp}-${i}`} className="group mb-3 flex items-start gap-1">
            <p
              className="min-w-0 flex-1 font-display text-[17px] leading-snug text-fg"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(beat.story) }}
            />
            {i < last ? (
              <button
                type="button"
                title="Voltar a este ponto e escolher outro caminho"
                aria-label="Voltar a este ponto"
                onClick={() => rewindTo(i)}
                className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xs text-subtle hover:bg-surface hover:text-fg"
              >
                <Undo2 className="size-4" />
              </button>
            ) : (
              <span className="size-11 shrink-0" aria-hidden />
            )}
          </div>
        ))}
        {groups.map((g) => (
          <div key={g.title} className="mb-3">
            <div className="mb-1 text-[10px] tracking-[0.14em] text-subtle uppercase">{g.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => interact(id)}
                  className="min-h-11 rounded-xs border border-border bg-surface px-2.5 py-1.5 text-sm text-choice hover:bg-elevated"
                >
                  {world ? entityDisplayName(world, id) : id}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-3 py-1.5 font-mono text-[11px] text-subtle">
        {game.lastRule ? `regra: ${game.lastRule.id}` : "nenhuma regra"} · {game.lastInteractionId ?? "—"}
        {via ? ` · ${via}` : ""}
      </div>
    </div>
  );
}
