import type { Core } from "../../../core/index.ts";
import { ExternalPluginEvent } from "../../../core/contracts/typed-event.ts";
import { DENIED_METHODS, inspectFromCore, renderKit } from "./kit.ts";
import { toJson } from "./json.ts";
import { runGuestSource } from "./sandbox.ts";
import { zipStore } from "./zip.ts";
import { triggerBrowserDownload } from "./download.ts";
import type {
  ExtHostService,
  ExternalPluginBundle,
  InstalledExternalPlugin,
  Json,
  PluginKit,
  SandboxHost,
} from "../types.ts";

const NAME_RE = /^ext-[a-z0-9-]+$/;
const STORAGE_KEY = "lume.ext-plugins.v1";

type Runtime = {
  bundle: ExternalPluginBundle;
  status: InstalledExternalPlugin["status"];
  error?: string;
  logs: string[];
  deactivate?: () => void;
  unsubs: Array<() => void>;
};

function readPersisted(): ExternalPluginBundle[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePersisted(bundles: ExternalPluginBundle[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
  } catch {
    /* ignore quota */
  }
}

function parseBundle(input: ExternalPluginBundle | string): ExternalPluginBundle {
  if (typeof input !== "string") {
    if (!input.manifest || typeof input.source !== "string") throw new Error("Bundle inválido");
    return { manifest: { ...input.manifest }, source: input.source };
  }
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as ExternalPluginBundle;
    if (!parsed.manifest || typeof parsed.source !== "string") throw new Error("JSON de plugin inválido");
    return { manifest: { ...parsed.manifest }, source: parsed.source };
  }
  return { manifest: { name: guessName(trimmed) ?? "ext-unnamed", version: "0.0.0" }, source: trimmed };
}

function guessName(source: string): string | null {
  const match = source.match(/name\s*:\s*["'](ext-[a-z0-9-]+)["']/);
  return match?.[1] ?? null;
}

export function createExtHostService(core: Core): { service: ExtHostService; dispatch: (type: string, payload: unknown) => void } {
  const guests = new Map<string, Runtime>();
  const listeners = new Map<string, Set<(payload: Json) => void>>();
  const guestStorage = new Map<string, Map<string, string>>();

  function persist(): void {
    writePersisted([...guests.values()].map((runtime) => runtime.bundle));
  }

  function publicList(): InstalledExternalPlugin[] {
    return [...guests.values()]
      .map((runtime) => ({
        name: runtime.bundle.manifest.name,
        version: runtime.bundle.manifest.version,
        description: runtime.bundle.manifest.description,
        status: runtime.status,
        error: runtime.error,
        logs: runtime.logs.slice(-50),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function makeHost(runtime: Runtime): SandboxHost {
    const name = runtime.bundle.manifest.name;
    const bag = guestStorage.get(name) ?? new Map<string, string>();
    guestStorage.set(name, bag);
    return {
      pluginName: name,
      log(message: string) {
        runtime.logs.push(String(message));
        if (runtime.logs.length > 200) runtime.logs.splice(0, runtime.logs.length - 200);
      },
      inspect() {
        return inspectFromCore(core);
      },
      call(capability: string, method: string, ...args: Json[]) {
        if ((DENIED_METHODS as readonly string[]).includes(method)) {
          throw new Error(`Método recusado no sandbox: ${capability}.${method}`);
        }
        const service = core.getService<Record<string, unknown>>(capability);
        const fn = service[method];
        if (typeof fn !== "function") throw new Error(`Sem método ${capability}.${method}`);
        const result = (fn as (...xs: unknown[]) => unknown).apply(service, args);
        if (result && typeof (result as Promise<unknown>).then === "function") {
          throw new Error(`call() síncrono apenas; ${capability}.${method} é async`);
        }
        return toJson(result);
      },
      on(eventType: string, handler: (payload: Json) => void) {
        const set = listeners.get(eventType) ?? new Set();
        set.add(handler);
        listeners.set(eventType, set);
        runtime.unsubs.push(() => set.delete(handler));
      },
      emit(topic: string, payload?: Json) {
        void core.emitEvent(new ExternalPluginEvent({ plugin: name, topic: String(topic), payload: payload ?? null }), name);
      },
      storage: {
        get(key: string) {
          return bag.get(key) ?? null;
        },
        set(key: string, value: string) {
          bag.set(key, value);
        },
        remove(key: string) {
          bag.delete(key);
        },
      },
    };
  }

  function dispatch(type: string, payload: unknown): void {
    const set = listeners.get(type);
    if (!set) return;
    let json: Json = null;
    try {
      json = toJson(payload);
    } catch {
      json = null;
    }
    for (const handler of set) {
      try {
        handler(json);
      } catch {
        /* isolate guest */
      }
    }
  }

  function stopRuntime(runtime: Runtime): void {
    try {
      runtime.deactivate?.();
    } catch {
      /* guest deactivate may throw */
    }
    for (const unsub of runtime.unsubs) unsub();
    runtime.unsubs = [];
    runtime.deactivate = undefined;
    if (runtime.status === "active") runtime.status = "stopped";
  }

  function startRuntime(runtime: Runtime): void {
    runtime.unsubs = [];
    runtime.error = undefined;
    const host = makeHost(runtime);
    try {
      const guest = runGuestSource(runtime.bundle.source, host);
      const manifest = (guest.manifest && typeof guest.manifest === "object" ? guest.manifest : {}) as { name?: string };
      if (manifest.name && manifest.name !== runtime.bundle.manifest.name) {
        throw new Error("manifest.name no source não coincide com o bundle");
      }
      guest.activate?.(host);
      runtime.deactivate = guest.deactivate;
      runtime.status = "active";
    } catch (error) {
      runtime.status = "error";
      runtime.error = (error as Error).message;
      throw error;
    }
  }

  function load(input: ExternalPluginBundle | string): InstalledExternalPlugin {
    const bundle = parseBundle(input);
    const name = bundle.manifest.name;
    if (!NAME_RE.test(name)) throw new Error("Nome de plugin externo inválido (use ext-minúsculas-e-hífens)");
    if (guests.has(name)) unload(name);
    const runtime: Runtime = { bundle, status: "stopped", logs: [], unsubs: [] };
    guests.set(name, runtime);
    try {
      startRuntime(runtime);
    } catch {
      /* status already error */
    }
    persist();
    return publicList().find((item) => item.name === name)!;
  }

  function unload(name: string): void {
    const runtime = guests.get(name);
    if (!runtime) return;
    stopRuntime(runtime);
    guests.delete(name);
    persist();
  }

  const service: ExtHostService = {
    inspect: () => inspectFromCore(core),
    buildKit(): PluginKit {
      return renderKit(inspectFromCore(core), 2);
    },
    kitZip() {
      const kit = service.buildKit();
      return { filename: kit.filename, bytes: zipStore(kit.files), kit };
    },
    downloadKit() {
      const pack = service.kitZip();
      return triggerBrowserDownload(pack.bytes, pack.filename, "application/zip");
    },
    list: publicList,
    load,
    unload,
    stop(name: string) {
      const runtime = guests.get(name);
      if (!runtime) return;
      stopRuntime(runtime);
      persist();
    },
    start(name: string) {
      const runtime = guests.get(name);
      if (!runtime) throw new Error("Plugin não instalado");
      startRuntime(runtime);
      persist();
    },
  };

  for (const bundle of readPersisted()) {
    try {
      load(bundle);
    } catch {
      /* skip corrupt */
    }
  }

  return { service, dispatch };
}

export { NAME_RE };
