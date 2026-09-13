import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import type { SkeinNode } from "../../../narrative-engine/lib/skein.ts";
import { cn } from "../utils.ts";

function SkeinBranch({
  node,
  prefix,
  path,
  onPick,
}: {
  node: SkeinNode;
  prefix: string[];
  path: string[];
  onPick: (triggerIds: string[]) => void;
}) {
  const here = node.triggerId ? [...prefix, node.triggerId] : prefix;
  const active = here.length > 0 && here.every((id, i) => path[i] === id) && here.length <= path.length;
  const current = active && here.length === path.length;

  return (
    <div className={node.triggerId ? "ml-3 border-l border-border pl-2" : ""}>
      {node.triggerId ? (
        <button
          type="button"
          onClick={() => onPick(here)}
          className={cn(
            "mb-0.5 block max-w-full truncate rounded-xs px-1.5 py-0.5 text-left font-mono text-[11px]",
            current ? "bg-elevated text-fg" : active ? "text-fg" : "text-muted hover:bg-surface hover:text-fg",
          )}
        >
          {node.triggerId}
        </button>
      ) : null}
      {node.children.map((child) => (
        <SkeinBranch key={child.triggerId} node={child} prefix={here} path={path} onPick={onPick} />
      ))}
    </div>
  );
}

export function Skein() {
  const skein = useIdeStore((s) => s.skein);
  const game = useIdeStore((s) => s.game);
  const rewindSkein = useIdeStore((s) => s.rewindSkein);
  const path = game?.history.map((beat) => beat.triggerId) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Skein</span>
        {game?.seed ? <span className="font-mono text-[10px] text-subtle">seed {game.seed}</span> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {skein.children.length === 0 ? (
          <p className="px-1 text-xs text-subtle">Joga para ramificar. Rewind e outra linha abre um ramo.</p>
        ) : (
          <SkeinBranch node={skein} prefix={[]} path={path} onPick={rewindSkein} />
        )}
      </div>
    </div>
  );
}
