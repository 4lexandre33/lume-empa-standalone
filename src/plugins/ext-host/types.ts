export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type ExternalPluginManifest = {
  name: string;
  version: string;
  description?: string;
  author?: string;
};

export type ExternalPluginBundle = {
  manifest: ExternalPluginManifest;
  source: string;
};

export type InstalledExternalPlugin = {
  name: string;
  version: string;
  description?: string;
  status: "active" | "stopped" | "error";
  error?: string;
  logs: string[];
};

export type HostInspect = {
  plugins: { name: string; version: string; provides: { name: string; version: string }[] }[];
  capabilities: { name: string; version: string; provider: string; methods: string[] }[];
  events: string[];
  world: JsonEntity[] | null;
};

export type JsonEntity = {
  id: string;
  tags: string[];
  stats: Record<string, number>;
  links: Record<string, string>;
  extra?: Record<string, string>;
};

export type KitFileMap = Record<string, string>;

export type PluginKit = {
  fingerprint: string;
  files: KitFileMap;
  filename: string;
};

export type ExtHostService = {
  inspect(): HostInspect;
  buildKit(): PluginKit;
  kitZip(): { filename: string; bytes: Uint8Array; kit: PluginKit };
  downloadKit(): boolean;
  list(): InstalledExternalPlugin[];
  load(bundle: ExternalPluginBundle | string): InstalledExternalPlugin;
  unload(name: string): void;
  stop(name: string): void;
  start(name: string): void;
};

export type SandboxHost = {
  readonly pluginName: string;
  log(message: string): void;
  inspect(): HostInspect;
  call(capability: string, method: string, ...args: Json[]): Json;
  on(eventType: string, handler: (payload: Json) => void): void;
  emit(topic: string, payload?: Json): void;
  storage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
  };
};
