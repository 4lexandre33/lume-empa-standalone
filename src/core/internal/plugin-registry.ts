/**
 * PluginRegistry — Gerencia registro e lifecycle de plugins
 */

import type { IPluginManifest, PluginFactory, PluginMetadata } from '../contracts/plugin-manifest.ts';
import type { Logger } from '../logger.ts';
import { PluginNotFoundError, DependencyError } from '../contracts/errors.ts';

export class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Registrar um plugin (antes de ativar)
   */
  register(manifest: IPluginManifest, factory: PluginFactory): void {
    if (this.plugins.has(manifest.name)) {
      throw new Error(`Plugin ${manifest.name} already registered`);
    }

    if (!manifest.name || !manifest.version) {
      throw new Error('Plugin manifest must have name and version');
    }

    this.plugins.set(manifest.name, {
      manifest,
      factory,
      state: 'pending'
    });

    this.logger.info(`Plugin registered: ${manifest.name}@${manifest.version}`);
  }

  /**
   * Ativar um plugin (chamado pelo Core)
   */
  async activate(
    pluginName: string,
    pluginContext: any,
    onDependencyReady?: (depName: string) => Promise<void>
  ): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      throw new PluginNotFoundError(pluginName);
    }

    if (entry.state === 'active') {
      this.logger.debug(`Plugin ${pluginName} already active`);
      return;
    }

    if (entry.state === 'failed') {
      throw new Error(`Plugin ${pluginName} previously failed to activate`);
    }

    try {
      // Validar dependências
      const missing = this.checkDependencies(pluginName);
      if (missing.length > 0) {
        throw new DependencyError(pluginName, missing);
      }

      entry.state = 'pending';
      const instance = await entry.factory(pluginContext);
      entry.instance = instance;
      entry.activatedAt = Date.now();

      // Ativar instância do plugin
      if (typeof instance.activate === 'function') {
        await instance.activate();
      }

      // Hooks adicionais
      if (instance.manifest.hooks?.init) {
        await instance.manifest.hooks.init();
      }

      entry.state = 'active';
      this.logger.info(`Plugin activated: ${pluginName}@${entry.manifest.version}`);

      // Notificar outros plugins que este ficou pronto
      if (onDependencyReady) {
        await onDependencyReady(pluginName);
      }
    } catch (err) {
      entry.state = 'failed';
      entry.error = err as Error;
      this.logger.error(`Plugin activation failed: ${pluginName}`, err as Error);
      throw err;
    }
  }

  /**
   * Desativar um plugin
   */
  async deactivate(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry || !entry.instance) return;

    try {
      if (typeof entry.instance.deactivate === 'function') {
        await entry.instance.deactivate();
      }
      if (entry.instance.manifest.hooks?.destroy) {
        await entry.instance.manifest.hooks.destroy();
      }
      entry.state = 'disabled';
      entry.instance = undefined;
      this.logger.info(`Plugin deactivated: ${pluginName}`);
    } catch (err) {
      this.logger.error(`Plugin deactivation failed: ${pluginName}`, err as Error);
    }
  }

  /**
   * Obter metadata de um plugin
   */
  get(pluginName: string): PluginMetadata | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Listar todos os manifests
   */
  list(): IPluginManifest[] {
    return Array.from(this.plugins.values()).map(e => e.manifest);
  }

  /**
   * Estado de um plugin
   */
  getState(pluginName: string): 'pending' | 'active' | 'failed' | 'disabled' | undefined {
    return this.plugins.get(pluginName)?.state;
  }

  /**
   * Desabilitar plugin (sem destroy)
   */
  disable(pluginName: string, reason?: string): void {
    const entry = this.plugins.get(pluginName);
    if (!entry) return;
    entry.state = 'disabled';
    this.logger.warn(
      `Plugin disabled: ${pluginName}${reason ? ` (${reason})` : ''}`
    );
  }

  /**
   * Re-habilitar plugin
   */
  enable(pluginName: string): void {
    const entry = this.plugins.get(pluginName);
    if (!entry) return;
    entry.state = 'active';
    this.logger.info(`Plugin enabled: ${pluginName}`);
  }

  /**
   * Verificar dependências resolvidas
   */
  private checkDependencies(pluginName: string): string[] {
    const entry = this.plugins.get(pluginName);
    if (!entry) return [];

    const missing: string[] = [];
    const requires = entry.manifest.requires?.mandatory || [];

    for (const dep of requires) {
      // 1. Match direto por nome de plugin
      const directPlugin = this.plugins.get(dep.name);
      if (directPlugin && directPlugin.state === 'active') {
        continue;
      }

      // 2. Match por capability provida por algum plugin ativo
      let capabilityFound = false;
      for (const p of this.plugins.values()) {
        if (p.state === 'active' && p.manifest.capabilities?.provides?.some((c) => c.name === dep.name)) {
          capabilityFound = true;
          break;
        }
      }

      if (!capabilityFound) {
        missing.push(`${dep.name}@${dep.version}`);
      }
    }

    return missing;
  }
}
