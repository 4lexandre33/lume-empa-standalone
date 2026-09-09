/**
 * ErrorBoundary — Isola falhas de plugins
 */

import type { Logger } from '../logger.ts';
import { PluginError } from '../contracts/errors.ts';

export interface ErrorBoundaryOptions {
  retries?: number;
  isolateOnFail?: boolean;
}

export type ErrorResult<T> = {
  ok: true;
  value: T;
} | {
  ok: false;
  error: Error;
};

export class ErrorBoundary {
  private failedPlugins: Set<string> = new Set();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Executar uma operação com isolamento de erro
   */
  async try<T>(
    pluginName: string,
    fn: () => Promise<T> | T,
    options: ErrorBoundaryOptions = {}
  ): Promise<ErrorResult<T>> {
    const { retries = 1, isolateOnFail = true } = options;
    let lastError: Error | undefined;

    // Verificar se plugin já falhou
    if (this.failedPlugins.has(pluginName)) {
      const error = new PluginError(
        pluginName,
        'PLUGIN_DISABLED',
        `Plugin is disabled due to previous failure`
      );
      return { ok: false, error };
    }

    // Tentar N vezes
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const value = await fn();
        return { ok: true, value };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Plugin ${pluginName} attempt ${attempt}/${retries} failed`,
          lastError
        );

        if (attempt < retries) {
          // Backoff simples (100ms entre tentativas)
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }
    }

    // Todas as tentativas falharam
    const error = new PluginError(
      pluginName,
      'EXECUTION_FAILED',
      lastError?.message || 'Unknown error',
      { cause: lastError }
    );

    if (isolateOnFail) {
      this.failedPlugins.add(pluginName);
      this.logger.error(
        `Plugin ${pluginName} isolated due to persistent failures`,
        error
      );
    }

    return { ok: false, error };
  }

  /**
   * Recuperar um plugin (remover de isolamento)
   */
  recover(pluginName: string): void {
    if (this.failedPlugins.has(pluginName)) {
      this.failedPlugins.delete(pluginName);
      this.logger.info(`Plugin ${pluginName} recovered and re-enabled`);
    }
  }

  /**
   * Verificar se plugin está isolado
   */
  isIsolated(pluginName: string): boolean {
    return this.failedPlugins.has(pluginName);
  }

  /**
   * Listar plugins isolados (debug)
   */
  listIsolated(): string[] {
    return Array.from(this.failedPlugins);
  }
}
