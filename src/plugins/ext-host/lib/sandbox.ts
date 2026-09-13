import type { SandboxHost } from "../types.ts";

const BLOCKED_GLOBALS = [
  "Function",
  "require",
  "module",
  "globalThis",
  "global",
  "window",
  "document",
  "process",
  "Deno",
  "XMLHttpRequest",
  "fetch",
  "WebSocket",
  "Worker",
  "SharedWorker",
  "importScripts",
  "Caches",
  "indexedDB",
  "localStorage",
  "sessionStorage",
] as const;

export function runGuestSource(source: string, host: SandboxHost): { activate?: (h: SandboxHost) => void; deactivate?: () => void; manifest?: unknown } {
  const frozen = Object.freeze({ ...host, storage: Object.freeze({ ...host.storage }) });
  const prelude = BLOCKED_GLOBALS.map((name) => `var ${name} = undefined;`).join("\n");
  const wrapped = `"use strict";\n${prelude}\n${source}\nreturn { activate: (typeof activate === "function" ? activate : (exports && exports.activate)), deactivate: (typeof deactivate === "function" ? deactivate : (exports && exports.deactivate)), manifest: (typeof manifest !== "undefined" ? manifest : (exports && exports.manifest)) };`;
  let factory: (host: SandboxHost, exports: Record<string, unknown>) => {
    activate?: (h: SandboxHost) => void;
    deactivate?: () => void;
    manifest?: unknown;
  };
  try {
    factory = new Function("host", "exports", wrapped) as typeof factory;
  } catch (error) {
    throw new Error(`Guest parse error: ${(error as Error).message}`);
  }
  const exports: Record<string, unknown> = {};
  return factory(frozen, exports) ?? {};
}
