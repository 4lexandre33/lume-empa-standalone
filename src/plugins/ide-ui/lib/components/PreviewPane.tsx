import { RotateCcw, Undo2 } from "lucide-react";
import { renderMarkdown, bannerOf } from "../../../narrative-engine/lib/index.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { Button } from "../ui/button.tsx";
import { CommandBar } from "./CommandBar.tsx";
import { BeatDebug } from "./BeatDebug.tsx";

export function PreviewPane({ mode = "ide" }: { mode?: "ide" | "play" }) {
  const game = useIdeStore((s) => s.game);
  const bootPreview = useIdeStore((s) => s.bootPreview);
  const resetPreview = useIdeStore((s) => s.resetPreview);
  const rewindTo = useIdeStore((s) => s.rewindTo);
  const lastNotice = useIdeStore((s) => s.lastNotice);
  const play = mode === "play";

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

  const last = game.history.length - 1;
  const banner = bannerOf(game.sifted ?? []);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-visible bg-paper">
      {play ? null : (
        <div className="flex items-center justify-between border-b border-border px-3 py-1">
          <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Preview</span>
          <Button size="icon-sm" variant="ghost" title="Recomeçar" aria-label="Recomeçar" onClick={resetPreview} className="size-11">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      )}
      {banner ? (
        <div role="status" className="border-b border-border bg-surface px-4 py-1.5 font-display text-sm text-fg">
          {banner}
        </div>
      ) : null}
      {lastNotice ? (
        <div role="status" className="border-b border-border bg-elevated px-4 py-1.5 text-sm text-muted">
          {lastNotice}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {game.history.map((beat: { timestamp: number; story: string }, i: number) => (
          <div key={`${beat.timestamp}-${i}`} className="group mb-3 flex items-start gap-1">
            <p
              className="min-w-0 flex-1 font-display text-[17px] leading-snug text-fg"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(beat.story) }}
            />
            {!play && i < last ? (
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
      </div>
      <CommandBar play={play} />
      {play ? null : <BeatDebug compact />}
    </div>
  );
}
