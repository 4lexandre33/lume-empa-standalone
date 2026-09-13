import { emptyBeat, formatBeat, type BeatTrace } from "../../../narrative-engine/lib/beat.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";

function Line({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block max-w-full truncate text-left hover:text-fg">
        {label}: {value}
      </button>
    );
  }
  return (
    <p className="truncate">
      {label}: {value}
    </p>
  );
}

export function BeatDebug({ compact = false }: { compact?: boolean }) {
  const game = useIdeStore((s) => s.game);
  const lastCommand = useIdeStore((s) => s.lastCommand);
  const revealRule = useIdeStore((s) => s.revealRule);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const trace: BeatTrace = game?.lastBeat ?? emptyBeat(game?.lastInteractionId ?? "");
  const text = formatBeat(trace, lastCommand ?? undefined);

  if (compact) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border px-3 py-1.5 font-mono text-[11px] leading-snug text-subtle" aria-label="beat">
        {text}
      </pre>
    );
  }

  const cands = trace.candidates.map((c) => `${c.ruleId} (spec ${c.score})`).join(", ");
  const effects = trace.effects.length ? trace.effects.join(", ") : "—";

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="border-b border-border px-3 py-1">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Beat</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-subtle">
        <p className="truncate text-fg">{lastCommand || trace.triggerId || "—"}</p>
        <Line label="regra" value={trace.ruleId ?? "nenhuma"} onClick={trace.ruleId ? () => revealRule(trace.ruleId!) : undefined} />
        <p className="truncate">candidatos: [{cands}]</p>
        <p className="truncate">efeitos: {effects}</p>
        {trace.vivos.length ? (
          trace.vivos.map((vivo) => (
            <p key={vivo.id} className="truncate">
              vivo:{" "}
              <button type="button" className="hover:text-fg" onClick={() => revealEntity(vivo.id)}>
                {vivo.id}
              </button>
              {" → "}
              {vivo.ruleId ? (
                <button type="button" className="hover:text-fg" onClick={() => revealRule(vivo.ruleId!)}>
                  {vivo.ruleId}
                </button>
              ) : (
                "—"
              )}
            </p>
          ))
        ) : (
          <p>vivo: —</p>
        )}
      </div>
    </div>
  );
}
