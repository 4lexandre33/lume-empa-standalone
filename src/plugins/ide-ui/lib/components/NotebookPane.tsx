import { useMemo, useState } from "react";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { parseCadernoLibrary, replaceCover, replacePage, appendCaderno } from "../../../notebook/lib/pages.ts";
import { assistNotebook } from "../../../notebook/lib/assist.ts";
import { cn } from "../utils.ts";

function isCapa(id: string): boolean {
  return id === "capa" || id.endsWith(":capa");
}

export function NotebookPane() {
  const project = useIdeStore((s) => s.project);
  const setNotebooks = useIdeStore((s) => s.setNotebooks);
  const setName = useIdeStore((s) => s.setName);
  const world = useIdeStore((s) => s.game?.worldModel ?? s.compiled?.worldModel);
  const text = project?.notebooksSource ?? "";
  const library = useMemo(() => parseCadernoLibrary(text), [text]);
  const notes = useMemo(() => assistNotebook(text, world).notes, [text, world]);
  const [pageId, setPageId] = useState("capa");
  const page = library.pages.find((item) => item.id === pageId) ?? null;
  const book =
    library.books.find((item) => item.id === page?.bookId) ??
    library.books.find((item) => item.toc.some((entry) => entry.id === pageId)) ??
    library.books[0] ??
    null;
  const showCover = isCapa(pageId) || !page;

  if (!project) return null;

  const write = (next: string) => setNotebooks(next);

  return (
    <div className="flex h-full min-h-0 bg-paper">
      <nav className="w-44 shrink-0 overflow-auto border-r border-border bg-elevated px-3 py-3" aria-label="Índice">
        <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Índice</p>
        <ul className="mt-2 space-y-3">
          {library.books.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPageId(item.toc[0]?.id ?? "capa")}
                className={cn(
                  "w-full rounded-xs px-1.5 py-1 text-left font-display text-sm hover:bg-surface",
                  book?.id === item.id && showCover ? "bg-surface font-medium text-fg" : "text-fg",
                )}
              >
                {item.cover.title || "Caderno"}
              </button>
              <ul className="mt-1 space-y-1">
                {item.toc
                  .filter((entry) => !isCapa(entry.id))
                  .map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setPageId(entry.id)}
                        className={cn(
                          "w-full rounded-xs px-1.5 py-1 text-left text-sm hover:bg-surface",
                          entry.level === 3 ? "pl-3 text-muted" : "text-fg",
                          pageId === entry.id ? "bg-surface font-medium text-fg" : "",
                        )}
                      >
                        {entry.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 w-full rounded-xs px-1.5 py-1 text-left text-sm text-muted hover:bg-surface hover:text-fg"
          onClick={() => {
            const next = appendCaderno(text);
            write(next);
            const lib = parseCadernoLibrary(next);
            const last = lib.books[lib.books.length - 1];
            if (last?.toc[0]) setPageId(last.toc[0].id);
          }}
        >
          Novo caderno
        </button>
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          {showCover && book ? (
            <div className="mx-auto flex max-w-lg flex-col gap-3">
              <p className="text-[10px] tracking-[0.18em] text-muted uppercase">Capa</p>
              <input
                className="w-full bg-transparent font-display text-4xl text-fg outline-none placeholder:text-subtle"
                placeholder="Título do caderno"
                value={book.cover.title}
                onChange={(e) => {
                  const cover = { ...book.cover, title: e.target.value };
                  write(replaceCover(text, cover, library.books.length > 1 ? book.id : undefined));
                  if (book.index === 0 && e.target.value.trim()) setName(e.target.value.trim());
                }}
              />
              <input
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                placeholder="Autora (opcional)"
                value={book.cover.author}
                onChange={(e) =>
                  write(replaceCover(text, { ...book.cover, author: e.target.value }, library.books.length > 1 ? book.id : undefined))
                }
              />
              <input
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                placeholder="Data (opcional)"
                value={book.cover.date}
                onChange={(e) =>
                  write(replaceCover(text, { ...book.cover, date: e.target.value }, library.books.length > 1 ? book.id : undefined))
                }
              />
              <textarea
                className="min-h-24 w-full resize-none bg-transparent text-sm leading-relaxed text-muted outline-none placeholder:text-subtle"
                placeholder="Dedicatória (opcional)"
                value={book.cover.dedication}
                onChange={(e) =>
                  write(replaceCover(text, { ...book.cover, dedication: e.target.value }, library.books.length > 1 ? book.id : undefined))
                }
              />
            </div>
          ) : (
            <div className="mx-auto flex h-full max-w-2xl flex-col">
              <h1 className="font-display text-3xl text-fg">{page?.title}</h1>
              <textarea
                className="mt-4 min-h-0 w-full flex-1 resize-none bg-transparent font-display text-[17px] leading-relaxed text-fg outline-none placeholder:text-subtle"
                placeholder="Escreva nesta página. Comentários // ficam na margem."
                value={page?.body ?? ""}
                onChange={(e) => page && write(replacePage(text, page.id, e.target.value))}
              />
            </div>
          )}
        </div>
      </div>
      <aside className="w-52 shrink-0 overflow-auto border-l border-border bg-elevated px-3 py-3" aria-label="Notas">
        <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Notas</p>
        <ul className="mt-2 space-y-2">
          {(page?.comments ?? []).map((comment) => (
            <li key={comment} className="text-sm leading-snug text-muted">
              {comment}
            </li>
          ))}
          {notes.map((note) => (
            <li key={note} className="font-display text-sm leading-snug text-fg">
              {note}
            </li>
          ))}
          {!notes.length && !(page?.comments ?? []).length ? (
            <li className="text-sm text-subtle">A margem guarda comentários // e avisos em prosa.</li>
          ) : null}
        </ul>
      </aside>
    </div>
  );
}
