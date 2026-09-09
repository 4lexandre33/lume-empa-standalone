/**
 * Logger interface para Core e Plugins
 */

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any> | Error): void;
  error(message: string, context?: Record<string, any> | Error): void;
}

/**
 * Console logger (implementação default)
 */
export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}]${this.prefix ? ` [${this.prefix}]` : ''} ${message}${ctx}`;
  }

  debug(message: string, context?: Record<string, any>): void {
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  info(message: string, context?: Record<string, any>): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: Record<string, any> | Error): void {
    const msg = context instanceof Error ? context.message : undefined;
    const ctx = context instanceof Error ? undefined : context;
    console.warn(this.formatMessage('WARN', message || msg || '', ctx));
  }

  error(message: string, context?: Record<string, any> | Error): void {
    const msg = context instanceof Error ? context.message : undefined;
    const ctx = context instanceof Error ? { stack: context.stack } : context;
    console.error(this.formatMessage('ERROR', message || msg || '', ctx));
  }
}

/**
 * Create logger com prefix de plugin
 */
export function createPluginLogger(pluginName: string): Logger {
  return new ConsoleLogger(pluginName);
}
