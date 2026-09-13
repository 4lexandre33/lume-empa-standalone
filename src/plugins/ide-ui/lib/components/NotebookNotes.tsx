import { useMemo } from "react";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { assistNotebook } from "../../../notebook/lib/assist.ts";

export function NotebookNotes() {
  const text = useIdeStore((s) => s.project.notebooksSource);
  const world = useIdeStore((s) => s.game?.worldModel ?? s.compiled?.worldModel);
  const notes = useMemo(() => assistNotebook(text ?? "", world).notes, [text, world]);
  if (!notes.length) return null;
  return (
    <aside className="max-h-40 shrink-0 overflow-auto border-t border-border bg-elevated px-4 py-2" aria-label="Notas">
      <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Notas</p>
      <ul className="mt-1 space-y-1">
        {notes.map((note) => (
          <li key={note} className="font-display text-sm leading-snug text-fg">
            {note}
          </li>
        ))}
      </ul>
    </aside>
  );
}
