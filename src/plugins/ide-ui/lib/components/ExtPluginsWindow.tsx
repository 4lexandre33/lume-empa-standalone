import { useEffect, useRef, useState } from "react";
import { FolderPlus, PackagePlus, X } from "lucide-react";
import { ensureExtHost } from "../../../ext-host/lib/ensure.ts";
import { bytesToBase64 } from "../../../ext-host/lib/download.ts";
import type { ExtHostService, InstalledExternalPlugin, PluginKit } from "../../../ext-host/types.ts";
import { Button } from "../ui/button.tsx";
import { cn } from "../utils.ts";

export function ExtPluginsWindow({ onClose }: { onClose: () => void }) {
  const [host, setHost] = useState<ExtHostService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("A ligar o host…");
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [kit, setKit] = useState<PluginKit | null>(null);
  const [pos, setPos] = useState({ x: 48, y: 72 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  void tick;

  useEffect(() => {
    let live = true;
    void ensureExtHost()
      .then((service) => {
        if (!live) return;
        setHost(service);
        setBusy("");
        if (!service) setError("Host de plugins externos não arrancou.");
      })
      .catch((err) => {
        if (!live) return;
        setBusy("");
        setError((err as Error).message);
      });
    return () => {
      live = false;
    };
  }, []);

  const guests: InstalledExternalPlugin[] = host?.list() ?? [];

  function refresh() {
    setTick((n) => n + 1);
  }

  function loadText(text: string) {
    if (!host) return;
    try {
      host.load(text);
      setDraft("");
      setError(null);
      refresh();
    } catch (err) {
      setError((err as Error).message);
      refresh();
    }
  }

  function downloadKit() {
    if (!host) return;
    const pack = host.kitZip();
    setKit(pack.kit);
    const ok = host.downloadKit();
    if (!ok && typeof document !== "undefined") {
      const href = `data:application/zip;base64,${bytesToBase64(pack.bytes)}`;
      const a = document.createElement("a");
      a.href = href;
      a.download = pack.filename;
      a.click();
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <div
        className="pointer-events-auto absolute flex w-[min(440px,calc(100%-24px))] flex-col rounded-sm border border-border bg-elevated shadow-2xl"
        style={{ left: pos.x, top: pos.y, maxHeight: "min(560px, calc(100% - 24px))" }}
      >
        <header
          className="flex cursor-grab items-center justify-between border-b border-border px-3 py-2 active:cursor-grabbing"
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            drag.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };
            const move = (ev: MouseEvent) => {
              if (!drag.current) return;
              setPos({ x: Math.max(8, ev.clientX - drag.current.dx), y: Math.max(8, ev.clientY - drag.current.dy) });
            };
            const up = () => {
              drag.current = null;
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
        >
          <div>
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Extensões</p>
            <h2 className="text-sm font-medium text-fg">Plugins externos</h2>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          {busy ? <p className="text-sm text-subtle">{busy}</p> : null}
          {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!host}
              onClick={downloadKit}
              className="h-8 rounded-xs border border-border px-2.5 text-xs text-fg hover:bg-surface disabled:opacity-40"
            >
              Descarregar kit
            </button>
            <button
              type="button"
              disabled={!host}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 items-center gap-1 rounded-xs border border-border px-2.5 text-xs text-fg hover:bg-surface disabled:opacity-40"
            >
              <FolderPlus className="size-3.5" />
              Carregar ficheiros
            </button>
            <span className="self-center font-mono text-[10px] text-subtle">
              {kit ? `fp ${kit.fingerprint}` : host ? `${guests.length} instalado${guests.length === 1 ? "" : "s"}` : ""}
            </span>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".js,.json,application/json,text/javascript"
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void Promise.all(files.map((file) => file.text())).then((texts) => {
                for (const text of texts) loadText(text);
              });
            }}
          />

          <p className="mb-2 text-[10px] tracking-[0.12em] text-subtle uppercase">Instalados</p>
          {guests.length === 0 ? (
            <p className="mb-3 text-xs text-subtle">Nenhum. Carrega vários `.js` / `.json` ou cola abaixo.</p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {guests.map((guest) => (
                <li key={guest.name} className="rounded-xs border border-border bg-bg px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-1.5 shrink-0 rounded-full", guest.status === "active" ? "bg-ok" : guest.status === "error" ? "bg-danger" : "bg-subtle")} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {guest.name}
                      <span className="text-subtle"> @{guest.version}</span>
                    </span>
                    <span className="text-[10px] text-subtle">{guest.status}</span>
                    {guest.status === "stopped" ? (
                      <button type="button" className="text-[10px] text-muted hover:text-fg" onClick={() => { host?.start(guest.name); refresh(); }}>
                        Ligar
                      </button>
                    ) : (
                      <button type="button" className="text-[10px] text-muted hover:text-fg" onClick={() => { host?.stop(guest.name); refresh(); }}>
                        Parar
                      </button>
                    )}
                    <button type="button" className="text-[10px] text-muted hover:text-danger" onClick={() => { host?.unload(guest.name); refresh(); }}>
                      Tirar
                    </button>
                  </div>
                  {guest.error ? <p className="mt-1 text-[11px] text-danger">{guest.error}</p> : null}
                  {guest.logs.length ? (
                    <pre className="mt-1 max-h-16 overflow-auto text-[10px] leading-4 text-subtle">{guest.logs.slice(-6).join("\n")}</pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <label className="mb-1 flex items-center gap-1 text-[10px] tracking-[0.12em] text-subtle uppercase">
            <PackagePlus className="size-3" />
            Colar plugin
          </label>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            placeholder={'{ "manifest": { "name": "ext-hello", "version": "1.0.0" }, "source": "function activate(host) { host.log(\\"ok\\"); }" }'}
            className="w-full rounded-xs border border-border bg-bg px-2 py-1.5 font-mono text-[11px] text-fg"
          />
          <button
            type="button"
            disabled={!host || !draft.trim()}
            onClick={() => loadText(draft)}
            className="mt-2 h-8 rounded-xs border border-border px-2.5 text-xs text-fg hover:bg-surface disabled:opacity-40"
          >
            Adicionar à lista
          </button>

          {kit ? (
            <details className="mt-3 text-xs text-subtle">
              <summary className="cursor-pointer text-muted">Ficheiros do kit ({Object.keys(kit.files).length})</summary>
              <ul className="mt-1 font-mono text-[10px]">
                {Object.keys(kit.files)
                  .sort()
                  .map((path) => (
                    <li key={path}>{path}</li>
                  ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
