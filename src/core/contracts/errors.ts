/**
 * Error classes para o sistema
 */

export class AppError extends Error {
  code: string;
  context?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context
    };
  }
}

export class PluginError extends AppError {
  pluginName: string;

  constructor(
    pluginName: string,
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(code, `[${pluginName}] ${message}`, context);
    this.name = 'PluginError';
    this.pluginName = pluginName;
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

export class ValidationError extends AppError {
  errors: Array<{ field: string; reason: string }>;

  constructor(
    message: string,
    errors: Array<{ field: string; reason: string }>
  ) {
    super('VALIDATION_ERROR', message, { errors });
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class CapabilityNotFoundError extends AppError {
  constructor(name: string, version?: string) {
    super(
      'CAPABILITY_NOT_FOUND',
      `Capability '${name}${version ? `@${version}` : ''}' not available`,
      { name, version }
    );
    this.name = 'CapabilityNotFoundError';
    Object.setPrototypeOf(this, CapabilityNotFoundError.prototype);
  }
}

export class PluginNotFoundError extends AppError {
  constructor(name: string) {
    super('PLUGIN_NOT_FOUND', `Plugin '${name}' not registered`, { name });
    this.name = 'PluginNotFoundError';
    Object.setPrototypeOf(this, PluginNotFoundError.prototype);
  }
}

export class DependencyError extends AppError {
  pluginName: string;
  missingCapabilities: string[];

  constructor(
    pluginName: string,
    missingCapabilities: string[]
  ) {
    super(
      'MISSING_DEPENDENCIES',
      `Plugin '${pluginName}' missing dependencies: ${missingCapabilities.join(', ')}`,
      { pluginName, missingCapabilities }
    );
    this.name = 'DependencyError';
    this.pluginName = pluginName;
    this.missingCapabilities = missingCapabilities;
    Object.setPrototypeOf(this, DependencyError.prototype);
  }
}
