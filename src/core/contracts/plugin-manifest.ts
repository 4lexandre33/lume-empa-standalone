/**
 * Plugin Manifest Contract
 * Cada plugin declara sua identidade, dependências e lifecycle aqui.
 */

import type { PluginContext } from './plugin-context.ts';

export interface Capability {
  name: string;      // "NarrativeEngine", "ProjectCloud"
  version: string;   // "1.0.0" (semver)
}

export interface PluginHooks {
  /**
   * Chamado após plugin ser ativado e dependências resolvidas
   */
  init?: () => Promise<void>;

  /**
   * Chamado antes de plugin ser desativado
   */
  destroy?: () => Promise<void>;

  /**
   * Chamado quando outro plugin específico se torna ativo
   * Útil para sincronia entre plugins
   */
  onPluginReady?: (pluginName: string) => Promise<void>;
}

export interface IPluginManifest {
  /**
   * Identidade do plugin (único no sistema)
   * Convenção: "lume-" + domínio (ex: "lume-narrative-engine")
   */
  name: string;

  /**
   * Versão semver (ex: "1.0.0")
   */
  version: string;

  /**
   * Descrição humanizada
   */
  description?: string;

  /**
   * Autor
   */
  author?: string;

  /**
   * Capabilities que este plugin OFERECE
   * Outros plugins podem consumir via api.getService()
   */
  capabilities?: {
    provides?: Capability[];
  };

  /**
   * Capabilities que este plugin CONSOME
   * Core valida que todas existem durante boot
   */
  requires?: {
    /**
     * Dependências obrigatórias (falha se não existir)
     */
    mandatory?: Capability[];

    /**
     * Dependências opcionais (não falha, plugin trata ausência)
     */
    optional?: Capability[];
  };

  /**
   * Lifecycle hooks
   */
  hooks?: PluginHooks;

  /**
   * Permissões (meta, para documentação/auditoria)
   */
  permissions?: {
    storage?: 'read' | 'write' | 'none';
    network?: 'read' | 'write' | 'none';
    events?: string[];  // lista de event types que pode ouvir
  };
}

/**
 * Interface que cada plugin implementa
 */
export interface IPlugin {
  manifest: IPluginManifest;
  context: PluginContext;

  /**
   * Ativar plugin (registrar capabilities, listeners, etc.)
   */
  activate(): Promise<void>;

  /**
   * Desativar plugin (limpar resources)
   */
  deactivate(): Promise<void>;
}

/**
 * Factory para criar plugin instances
 */
export type PluginFactory = (context: PluginContext) => IPlugin | Promise<IPlugin>;

/**
 * Metadados de um plugin registrado no Core
 */
export interface PluginMetadata {
  manifest: IPluginManifest;
  factory: PluginFactory;
  instance?: IPlugin;
  state: 'pending' | 'active' | 'failed' | 'disabled';
  error?: Error;
  activatedAt?: number;
}
