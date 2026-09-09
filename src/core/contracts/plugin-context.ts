/**
 * PluginContext
 * O que cada plugin recebe do Core (PluginContext passado para factory)
 */

import type { CoreAPI } from '../api.ts';
import type { CapabilityExport } from '../internal/capability-registry.ts';

export interface PluginContext extends CoreAPI {
  /**
   * Nome do plugin (para logging/diagnostics)
   */
  pluginName: string;

  /**
   * Versão do plugin
   */
  pluginVersion: string;

  /**
   * Registrar uma capability diretamente pelo plugin durante activate()
   */
  registerCapability(capability: CapabilityExport): void;
}
