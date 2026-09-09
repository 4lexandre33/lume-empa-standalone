/**
 * Core API — Interface pública para plugins
 * Plugins recebem esta interface via PluginContext
 * Nunca acessam internals do Core diretamente
 */

import type { TypedEvent } from './contracts/typed-event.ts';
import type { Logger } from './logger.ts';

export type TypedEventConstructor<E extends TypedEvent<any> = TypedEvent<any>> = new (...args: any[]) => E;

export interface EventMeta {
  timestamp: number;
  sourcePlugin: string;
  traceId: string;
  priority: 'high' | 'normal' | 'low';
}

export interface SubscriptionInfo {
  eventType: string;
  handlerCount: number;
  plugins: string[];
}

export interface EventLogEntry {
  type: string;
  sourcePlugin: string;
  subscriberPlugin?: string;
  timestamp: number;
  duration?: number;
  error?: string;
}

export interface PluginStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

export interface DiagnosticsAPI {
  listSubscriptions(): SubscriptionInfo[];
  getEventLog(eventType?: string, limit?: number): EventLogEntry[];
  getPluginState(name: string): 'pending' | 'active' | 'failed' | 'disabled' | undefined;
  listPlugins(): string[];
}

/**
 * CoreAPI — o que cada plugin pode fazer
 */
export interface CoreAPI {
  /**
   * Emitir um evento tipado.
   * - Validação de schema automática
   * - Async: enfileira e executa handlers em ordem de prioridade
   * - Erros de handler são isolados (ErrorBoundary)
   */
  emitEvent<T>(event: TypedEvent<T>): Promise<void>;

  /**
   * Subscrever a um tipo de evento.
   * Tipo-seguro: eventType é TypedEventConstructor.
   * @returns Função para desinscrever
   */
  on<E extends TypedEvent<any>>(
    eventType: TypedEventConstructor<E>,
    handler: (event: E, meta?: EventMeta) => void | Promise<void>,
    options?: { once?: boolean; priority?: 'high' | 'normal' | 'low' }
  ): () => void;

  /**
   * Consumir uma capability (RPC service) de outro plugin.
   * Valida versão compatível e schema de entrada/saída.
   * @throws CapabilityNotFoundError se não existir
   *
   * @example
   * const engine = api.getService<NarrativeEngine>('NarrativeEngine', '1.0');
   * const result = await engine.compileProject(project);
   */
  getService<T>(name: string, version?: string): T;

  /**
   * Logger com contexto automático do plugin.
   * Todos os logs incluem [pluginName] e timestamp.
   */
  logger: Logger;

  /**
   * Storage key-value isolado (escopo: [pluginName])
   * Similar a localStorage, mas per-plugin.
   * Persiste entre reloads.
   */
  storage: PluginStorage;

  /**
   * Diagnostics — debug em dev, readonly em prod
   */
  diagnostics: DiagnosticsAPI;
}
