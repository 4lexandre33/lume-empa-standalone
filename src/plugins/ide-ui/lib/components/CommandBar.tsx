import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { applySuggestion, isAutocompleteSlot } from "../../../intent-engine/lib/index.ts";
import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";

export function CommandBar({ play = false }: { play?: boolean }) {
  const game = useIdeStore((s) => s.game);
  const suggestCommands = useIdeStore((s) => s.suggestCommands);
  const resolveCommand = useIdeStore((s) => s.resolveCommand);
  const executeCommand = useIdeStore((s) => s.executeCommand);

  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => (game ? suggestCommands(text) : []), [game, suggestCommands, text]);
  const resolution = game ? resolveCommand(text) : null;
  const showList = open && isAutocompleteSlot(text) && suggestions.length > 0;
  const shown = showList ? suggestions : [];

  useEffect(() => {
    setActive(0);
  }, [text]);

  if (!game) return null;

  function complete(token: string) {
    const next = applySuggestion(text, token);
    setText(next);
    setOpen(isAutocompleteSlot(next));
    inputRef.current?.focus();
  }

  function submit() {
    const current = resolveCommand(text);
    if (current?.status === "VALID") {
      if (executeCommand(text)) {
        setText("");
        setOpen(false);
      }
      return;
    }
    if (shown.length > 0 && (current?.status === "INCOMPLETE" || !text.trim())) {
      complete(shown[Math.min(active, shown.length - 1)]!.token);
      return;
    }
    executeCommand(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (isAutocompleteSlot(text)) setOpen(true);
      if (shown.length) setActive((i) => (i + 1) % shown.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (isAutocompleteSlot(text)) setOpen(true);
      if (shown.length) setActive((i) => (i - 1 + shown.length) % shown.length);
    } else if (event.key === "Tab") {
      if (shown.length) {
        event.preventDefault();
        complete(shown[Math.min(active, shown.length - 1)]!.token);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative z-20 border-t border-border bg-paper">
      {shown.length > 0 ? (
        <ul
          role="listbox"
          aria-label="Sugestões"
          className="absolute inset-x-2 bottom-full z-30 mb-1 max-h-48 overflow-auto rounded-xs border border-border bg-elevated py-1 shadow-lg"
        >
          {shown.map((suggestion, index) => (
            <li key={`${suggestion.path}-${suggestion.token}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => complete(suggestion.token)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm ${
                  index === active ? "bg-surface text-fg" : "text-choice hover:bg-surface"
                }`}
              >
                <span className="font-mono">{suggestion.token}</span>
                <span className="truncate text-[11px] text-subtle">{suggestion.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center gap-2 px-3 py-2">
        {play ? <span className="font-mono text-sm text-muted">{">"}</span> : null}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown.length > 0}
          aria-label={play ? "Comando do jogador" : "Comando"}
          spellCheck={false}
          autoComplete="off"
          placeholder={play ? "" : "intent."}
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setOpen(isAutocompleteSlot(next));
          }}
          onFocus={() => {
            if (isAutocompleteSlot(text)) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-h-11 w-full rounded-xs border border-border bg-surface px-2.5 font-mono text-sm text-fg outline-none placeholder:text-subtle focus:border-choice"
        />
      </div>
      {play ? null : (
        <div className="px-3 pb-2">
          {resolution && text.trim() ? (
            <p className="font-mono text-[11px] text-subtle">
              {resolution.status === "VALID" ? "pronto" : resolution.message ?? resolution.status}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-subtle">um ponto abre o autocomplete</p>
          )}
        </div>
      )}
    </div>
  );
}
