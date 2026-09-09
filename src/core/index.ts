/**
 * Core — Fachada Principal (Microkernel)
 * Coordena EventBus, PluginRegistry, CapabilityRegistry, ErrorBoundary
 */

import type { PluginStorage } from './api.ts';
import type { TypedEvent, TypedEventConstructor } from './contracts/typed-event.ts';
import type { IPluginManifest, PluginFactory } from './contracts/plugin-manifest.ts';
import type { Logger } from './logger.ts';
import type { PluginContext } from './contracts/plugin-context.ts';

import { EventBus } from './internal/event-bus.ts';
import { PluginRegistry } from './internal/plugin-registry.ts';
import { CapabilityRegistry } from './internal/capability-registry.ts';
import { ErrorBoundary } from './internal/error-boundary.ts';
import { ConsoleLogger, createPluginLogger } from './logger.ts';
import { AppError } from './contracts/errors.ts';

/**
 * In-memory storage para plugins
 */
class InMemoryPluginStorage implements PluginStorage {
  private data: Map<string, string> = new Map();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * Core — Microkernel principal
 */
export class Core {
  private eventBus: EventBus;
  private pluginRegistry: PluginRegistry;
  private capabilityRegistry: CapabilityRegistry;
  private errorBoundary: ErrorBoundary;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger('[Core]');
    this.eventBus = new EventBus(this.logger);
    this.pluginRegistry = new PluginRegistry(this.logger);
    this.capabilityRegistry = new CapabilityRegistry(this.logger);
    this.errorBoundary = new ErrorBoundary(this.logger);

    this.logger.info('Core initialized');
  }

  /**
   * Registrar um plugin (antes de ativar)
   */
  registerPlugin(manifest: IPluginManifest, factory: PluginFactory): void {
    this.pluginRegistry.register(manifest, factory);
  }

  /**
   * Ativar um plugin
   */
  async activatePlugin(pluginName: string): Promise<void> {
    const entry = this.pluginRegistry.get(pluginName);
    if (!entry) {
      throw new AppError('PLUGIN_NOT_FOUND', `Plugin ${pluginName} not registered`);
    }

    // Criar contexto do plugin
    const pluginContext = this.createPluginContext(pluginName, entry.manifest.version!);

    // Ativar via registry (com validação de deps)
    await this.pluginRegistry.activate(pluginName, pluginContext, async (depName) => {
      if (entry.manifest.hooks?.onPluginReady) {
        await entry.manifest.hooks.onPluginReady(depName);
      }
    });
  }

  /**
   * Desativar um plugin
   */
  async deactivatePlugin(pluginName: string): Promise<void> {
    await this.pluginRegistry.deactivate(pluginName);
  }

  /**
   * Ativar múltiplos plugins em paralelo (com resolução de deps)
   */
  async activatePlugins(pluginNames: string[]): Promise<void> {
    // Topological sort by dependencies (simples: ativar em ordem)
    for (const pluginName of pluginNames) {
      try {
        await this.activatePlugin(pluginName);
      } catch (err) {
        this.logger.error(`Failed to activate plugin ${pluginName}`, err as Error);
        // Continuar com próximo (ou parar? Por enquanto continuamos)
      }
    }
  }

  /**
   * Criar contexto que será passado ao plugin factory
   */
  private createPluginContext(pluginName: string, pluginVersion: string): PluginContext {
    return {
      pluginName,
      pluginVersion,

      registerCapability: (capability) => {
        this.capabilityRegistry.register(capability);
      },

      emitEvent: async <T,>(event: TypedEvent<T>) => {
        return this.errorBoundary.try(pluginName, async () => {
          await this.eventBus.emit(event, pluginName);
        }).then((result) => {
          if (!result.ok) throw result.error;
        });
      },

      on: <E extends TypedEvent<any>>(
        eventType: TypedEventConstructor<E>,
        handler: (event: E) => void | Promise<void>,
        options?: { once?: boolean; priority?: 'high' | 'normal' | 'low' }
      ) => {
        return this.eventBus.on(eventType, handler, pluginName, options);
      },

      getService: <T,>(name: string, version?: string): T => {
        return this.capabilityRegistry.use<T>(name, version);
      },

      logger: createPluginLogger(pluginName),

      storage: new InMemoryPluginStorage(),

      diagnostics: {
        listSubscriptions: () => this.eventBus.listSubscriptions(),
        getEventLog: (eventType?, limit?) => this.eventBus.getEventLog(eventType, limit),
        getPluginState: (name) => this.pluginRegistry.getState(name),
        listPlugins: () => this.pluginRegistry.list().map(m => m.name)
      }
    };
  }

  /**
   * Emitir evento via Core (nível global / host)
   */
  async emitEvent<T>(event: TypedEvent<T>, source = 'core'): Promise<void> {
    await this.eventBus.emit(event, source);
  }

  /**
   * Subscrever a eventos via Core (nível global / host)
   */
  on<E extends TypedEvent<any>>(
    eventType: TypedEventConstructor<E>,
    handler: (event: E) => void | Promise<void>,
    options?: { once?: boolean; priority?: 'high' | 'normal' | 'low' }
  ): () => void {
    return this.eventBus.on(eventType, handler, 'core', options);
  }

  /**
   * Registrar uma capability (chamado pelo plugin durante init)
   * Exposto via api.getService internamente
   */
  registerCapability(capability: any): void {
    this.capabilityRegistry.register(capability);
  }

  /**
   * Obter uma capability (RPC service)
   */
  getService<T = any>(name: string, version?: string): T {
    return this.capabilityRegistry.use<T>(name, version);
  }

  /**
   * Listar todos os plugins registrados
   */
  listPlugins(): IPluginManifest[] {
    return this.pluginRegistry.list();
  }

  /**
   * Listar plugins ativos
   */
  listActivePlugins(): string[] {
    return this.pluginRegistry
      .list()
      .filter(m => this.pluginRegistry.getState(m.name) === 'active')
      .map(m => m.name);
  }

  /**
   * Diagnostics gerais
   */
  getDiagnostics() {
    return {
      plugins: this.pluginRegistry.list().map(m => ({
        name: m.name,
        version: m.version,
        state: this.pluginRegistry.getState(m.name),
        capabilities: m.capabilities?.provides?.map(c => `${c.name}@${c.version}`) || []
      })),
      subscriptions: this.eventBus.listSubscriptions(),
      isolatedPlugins: this.errorBoundary.listIsolated(),
      capabilities: this.capabilityRegistry.list()
    };
  }

  /**
   * Reset (para testes)
   */
  async shutdown(): Promise<void> {
    const plugins = this.pluginRegistry.list();
    for (const manifest of plugins) {
      await this.deactivatePlugin(manifest.name);
    }
    this.logger.info('Core shutdown complete');
  }
}

/**
 * Factory para criar uma instância do Core
 */
export function createCore(logger?: Logger): Core {
  return new Core(logger);
}
