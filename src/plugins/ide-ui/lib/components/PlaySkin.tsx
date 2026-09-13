import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { playHud } from "../play.ts";
import { PreviewPane } from "./PreviewPane.tsx";

export function PlaySkin() {
  const project = useIdeStore((s) => s.project);
  const game = useIdeStore((s) => s.game);
  const closePlay = useIdeStore((s) => s.closePlay);
  const player = game?.worldModel.get(game.playerEntityId);
  const hud = playHud(project?.meta.name ?? "Jogo", game?.history.length ?? 0, player?.stats);

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-paper text-fg">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <h1 className="min-w-0 truncate font-display text-xl">{hud.title}</h1>
        <span className="font-mono text-[11px] text-subtle">turno {hud.turn}</span>
        {hud.score != null ? <span className="font-mono text-[11px] text-subtle">score {hud.score}</span> : null}
        <button
          type="button"
          onClick={closePlay}
          className="ml-auto h-8 rounded-xs px-2.5 text-sm text-muted hover:bg-elevated hover:text-fg"
        >
          Caderno
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <PreviewPane mode="play" />
      </div>
    </div>
  );
}
