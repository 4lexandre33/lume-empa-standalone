/**
 * EventBus — Dispatcher de eventos type-safe
 * Internals: não acessível diretamente de plugins
 */

import type { TypedEvent, TypedEventConstructor } from '../contracts/typed-event.ts';
import type { Logger } from '../logger.ts';
import { ValidationError } from '../contracts/errors.ts';
import { EVENT_SCHEMAS } from '../contracts/typed-event.ts';

export interface EventSubscription {
  handler: (event: any) => void | Promise<void>;
  pluginName: string;
  priority: 'high' | 'normal' | 'low';
  once: boolean;
  id: string;  // unique ID para unsubscribe
}

export interface EventLogEntry {
  type: string;
  sourcePlugin: string;
  subscriberPlugin?: string;
  timestamp: number;
  duration?: number;
  error?: string;
}

export interface SubscriptionInfo {
  eventType: string;
  handlerCount: number;
  plugins: string[];
}

/**
 * Type-safe JSON schema validator (simples)
 */
function validateSchema(data: any, schema: any): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (schema.type && typeof data !== schema.type) {
    errors.push(`Expected ${schema.type}, got ${typeof data}`);
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!data || !(field in data) || data[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  if (schema.properties && data && typeof data === 'object') {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data && (propSchema as any).type && typeof data[key] !== (propSchema as any).type) {
        errors.push(`Field '${key}': expected ${(propSchema as any).type}, got ${typeof data[key]}`);
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export class EventBus {
  private subscribers: Map<string, Set<EventSubscription>> = new Map();
  private eventLog: EventLogEntry[] = [];
  private maxLogSize = 1000;
  private subscriptionCounter = 0;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Emitir um evento (validado + enfileirado)
   */
  async emit<T>(
    event: TypedEvent<T>,
    sourcePlugin: string
  ): Promise<void> {
    const eventType = event.type;

    try {
      // 1. Validar schema se existir
      const schema = EVENT_SCHEMAS.get(eventType);
      if (schema) {
        const validation = validateSchema(event.data, schema);
        if (!validation.ok) {
          throw new ValidationError(`Event ${eventType} failed validation`, 
            validation.errors.map(err => ({ field: 'data', reason: err }))
          );
        }
      } else {
        this.logger.debug(`Event type ${eventType} has no registered schema`);
      }

      // 2. Recuperar subscribers
      const subs = this.subscribers.get(eventType);
      if (!subs || subs.size === 0) {
        this.logger.debug(`Event ${eventType} has no subscribers`);
        return;
      }

      // 3. Ordenar por prioridade
      const sorted = Array.from(subs).sort((a, b) => {
        const priorityMap = { high: 0, normal: 1, low: 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      });

      // 4. Executar handlers (isolados)
      for (const sub of sorted) {
        const startTime = Date.now();
        try {
          await sub.handler(event);
          const duration = Date.now() - startTime;
          this.recordEventLog({
            type: eventType,
            sourcePlugin,
            subscriberPlugin: sub.pluginName,
            timestamp: Date.now(),
            duration
          });
        } catch (err) {
          const duration = Date.now() - startTime;
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.recordEventLog({
            type: eventType,
            sourcePlugin,
            subscriberPlugin: sub.pluginName,
            timestamp: Date.now(),
            duration,
            error: errorMsg
          });
          this.logger.warn(
            `Handler ${sub.pluginName} failed for event ${eventType}: ${errorMsg}`
          );
          // Não re-throw: ErrorBoundary do Core vai isolar esse plugin
        }

        // Remove se foi "once"
        if (sub.once) {
          subs.delete(sub);
        }
      }
    } catch (err) {
      this.logger.error(`EventBus.emit failed for ${eventType}`, err as Error);
      throw err;
    }
  }

  /**
   * Subscrever a um tipo de evento
   */
  on<E extends TypedEvent<any>>(
    eventType: TypedEventConstructor<E>,
    handler: (event: E) => void | Promise<void>,
    pluginName: string,
    options?: { once?: boolean; priority?: 'high' | 'normal' | 'low' }
  ): () => void {
    let type: string;
    try {
      type = new (eventType as any)({} as any).type;
    } catch {
      type = (eventType as any).type || (eventType as any).name;
    }
    const priority = options?.priority ?? 'normal';
    const subscriptionId = String(++this.subscriptionCounter);

    const sub: EventSubscription = {
      handler: handler as any,
      pluginName,
      priority,
      once: options?.once ?? false,
      id: subscriptionId
    };

    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }

    const subs = this.subscribers.get(type)!;
    subs.add(sub);

    this.logger.debug(
      `Plugin ${pluginName} subscribed to ${type}`,
      { subscriptionId, priority }
    );

    // Unsubscribe function
    return () => {
      subs.delete(sub);
      this.logger.debug(
        `Plugin ${pluginName} unsubscribed from ${type}`,
        { subscriptionId }
      );
    };
  }

  /**
   * Registrar schema de um evento (chamado pelo plugin ou Core)
   */
  registerEventSchema(eventType: string, schema: any): void {
    EVENT_SCHEMAS.set(eventType, schema);
    this.logger.debug(`Registered schema for event type: ${eventType}`);
  }

  private recordEventLog(entry: EventLogEntry): void {
    this.eventLog.push(entry);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }

  /**
   * Obter histórico de eventos (debug)
   */
  getEventLog(eventType?: string, limit?: number): EventLogEntry[] {
    let filtered = this.eventLog;
    if (eventType) {
      filtered = filtered.filter(e => e.type === eventType);
    }
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Listar subscribers (debug)
   */
  listSubscriptions(): SubscriptionInfo[] {
    const info: SubscriptionInfo[] = [];
    for (const [eventType, subs] of this.subscribers) {
      const plugins = Array.from(subs).map(s => s.pluginName);
      info.push({
        eventType,
        handlerCount: subs.size,
        plugins: [...new Set(plugins)]
      });
    }
    return info;
  }
}
