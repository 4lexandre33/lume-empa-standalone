/**
 * CapabilityRegistry — Service discovery
 */

import type { Logger } from '../logger.ts';
import { CapabilityNotFoundError } from '../contracts/errors.ts';
import { satisfiesSemver } from './semver.ts';

export interface CapabilityExport {
  name: string;
  version: string;
  provider: string;
  api: Record<string, (...args: any[]) => any>;
}

export class CapabilityRegistry {
  private capabilities: Map<string, CapabilityExport> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Registrar uma capability (chamado pelo plugin)
   */
  register(capability: CapabilityExport): void {
    const key = `${capability.name}@${capability.version}`;

    if (this.capabilities.has(key)) {
      throw new Error(`Capability ${key} already registered`);
    }

    this.capabilities.set(key, capability);
    this.logger.info(`Capability registered: ${key} (provider: ${capability.provider})`);
  }

  /**
   * Consumir uma capability (chamado pelo plugin via api.getService)
   */
  use<T = any>(name: string, version?: string): T {
    // Se versão não especificada, tenta achar qualquer versão
    if (!version) {
      for (const cap of this.capabilities.values()) {
        if (cap.name === name) {
          this.logger.debug(`Resolved capability ${name} to version ${cap.version}`);
          return cap.api as T;
        }
      }
    }

    // Se versão especificada, valida compatibilidade semver
    const key = `${name}@${version}`;
    if (this.capabilities.has(key)) {
      return this.capabilities.get(key)!.api as T;
    }

    // Fallback: tenta achar versão compatível
    for (const cap of this.capabilities.values()) {
      if (cap.name === name && version && satisfiesSemver(cap.version, version)) {
        this.logger.debug(
          `Resolved capability ${name}@${version} to ${cap.version}`
        );
        return cap.api as T;
      }
    }

    throw new CapabilityNotFoundError(name, version);
  }

  /**
   * Listar todas as capabilities (debug)
   */
  list(): CapabilityExport[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Obter um capability específico (debug)
   */
  get(name: string, version?: string): CapabilityExport | undefined {
    const key = `${name}@${version}`;
    return this.capabilities.get(key);
  }
}
