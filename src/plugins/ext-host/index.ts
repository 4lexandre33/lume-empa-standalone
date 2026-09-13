/**
 * External Plugin Host
 * Guests (ext-*) run in a JSON sandbox. Kernel plugins stay untouched.
 */

import type { IPlugin, IPluginManifest } from "../../core/contracts/plugin-manifest.ts";
import type { PluginContext } from "../../core/contracts/plugin-context.ts";
import {
  GameBeatGeneratedEvent,
  IntentDispatchedEvent,
  KnowledgeUpdatedEvent,
  WorldEventOccurredEvent,
} from "../../core/contracts/typed-event.ts";
import { EXT_HOST_MANIFEST } from "./manifest.ts";
import { createExtHostService } from "./lib/registry.ts";
import type { ExtHostService } from "./types.ts";
import type { Core } from "../../core/index.ts";

export * from "./manifest.ts";
export * from "./types.ts";
export { renderKit, inspectFromCore, fingerprintFiles } from "./lib/kit.ts";
export { zipStore } from "./lib/zip.ts";
export { runGuestSource } from "./lib/sandbox.ts";

export class ExtHostPlugin implements IPlugin {
  manifest: IPluginManifest = EXT_HOST_MANIFEST;
  context: PluginContext;
  private service: ExtHostService | null = null;
  private unsubs: Array<() => void> = [];

  constructor(context: PluginContext) {
    this.context = context;
  }

  async activate(): Promise<void> {
    this.context.logger.info("Activating Lume External Plugin Host...");
    const core = (globalThis as { __LUME_CORE__?: Core }).__LUME_CORE__;
    const hostCore = core ?? (this.context as unknown as { __core?: Core }).__core;
    if (!hostCore) {
      // Fallback: wrap context diagnostics/getService as a Core-like facade
      const facade = contextAsCore(this.context);
      const { service, dispatch } = createExtHostService(facade);
      this.service = service;
      this.bindEvents(dispatch);
    } else {
      const { service, dispatch } = createExtHostService(hostCore);
      this.service = service;
      this.bindEvents(dispatch);
    }

    this.context.registerCapability({
      name: "ExtHost",
      version: "1.0.0",
      provider: this.manifest.name,
      api: this.service as any,
    });
    (globalThis as { __LUME_EXT_HOST__?: ExtHostService }).__LUME_EXT_HOST__ = this.service;
    this.context.logger.info("Lume External Plugin Host activated.");
  }

  private bindEvents(dispatch: (type: string, payload: unknown) => void): void {
    this.unsubs.push(
      this.context.on(GameBeatGeneratedEvent, (event) => dispatch(event.type, event.data as unknown as Record<string, unknown>)),
      this.context.on(WorldEventOccurredEvent, (event) => dispatch(event.type, event.data as unknown as Record<string, unknown>)),
      this.context.on(KnowledgeUpdatedEvent, (event) => dispatch(event.type, event.data as unknown as Record<string, unknown>)),
      this.context.on(IntentDispatchedEvent, (event) => dispatch(event.type, event.data as unknown as Record<string, unknown>)),
    );
  }

  async deactivate(): Promise<void> {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.service = null;
    this.context.logger.info("Lume External Plugin Host deactivated.");
  }

  getService(): ExtHostService {
    if (!this.service) throw new Error("ExtHost not active");
    return this.service;
  }
}

export function createExtHostPlugin(context: PluginContext): IPlugin {
  return new ExtHostPlugin(context);
}

function contextAsCore(context: PluginContext): Core {
  return {
    getService: context.getService.bind(context),
    getDiagnostics: () => ({
      plugins: context.diagnostics.listPlugins().map((name) => ({ name, version: "1.0.0", state: context.diagnostics.getPluginState(name), capabilities: [] })),
      subscriptions: context.diagnostics.listSubscriptions(),
      isolatedPlugins: [],
      capabilities: [],
    }),
    listPlugins: () => context.diagnostics.listPlugins().map((name) => ({ name, version: "1.0.0" })),
    emitEvent: context.emitEvent.bind(context),
  } as unknown as Core;
}

export function getExtHost(): ExtHostService | null {
  try {
    const core = (globalThis as { __LUME_CORE__?: Core }).__LUME_CORE__;
    if (core) return core.getService<ExtHostService>("ExtHost");
  } catch {
    /* not booted */
  }
  return (globalThis as { __LUME_EXT_HOST__?: ExtHostService }).__LUME_EXT_HOST__ ?? null;
}
