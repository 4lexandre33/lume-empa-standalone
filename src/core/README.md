# Lume Core — Microkernel Platform Architecture

Este diretório contém o **Core** (microkernel) da plataforma Lume, responsável por:

- **Event Bus**: Dispatcher de eventos type-safe entre plugins
- **Plugin Registry**: Gerencia registro e lifecycle de plugins
- **Capability Registry**: Service discovery (RPC)
- **Error Boundary**: Isolamento de falhas

## Estrutura

```
src/core/
├── index.ts                 # Core principal (fachada)
├── api.ts                   # CoreAPI interface (público para plugins)
├── logger.ts                # Logger interface
├── contracts/               # Tipos públicos (não-internals)
│   ├── typed-event.ts       # Definição de eventos
│   ├── plugin-manifest.ts   # Manifest de plugin
│   ├── plugin-context.ts    # Contexto recebido pelo plugin
│   └── errors.ts            # Error classes
├── internal/                # Implementações (privado)
│   ├── event-bus.ts         # Dispatcher
│   ├── plugin-registry.ts   # Registro
│   ├── capability-registry.ts # Service discovery
│   └── error-boundary.ts    # Isolamento
└── README.md                # Este arquivo
```

## Ciclo de Vida

### 1. Boot

```typescript
import { createCore } from '@/core';
import { createNarrativeEnginePlugin } from '@/plugins/narrative-engine';

async function bootApp() {
  const core = createCore();

  // Registrar plugins (sem ativar ainda)
  core.registerPlugin(narrativeEngineManifest, createNarrativeEnginePlugin);
  core.registerPlugin(cloudPluginManifest, createCloudPlugin);

  // Ativar em sequência (respeita dependências)
  await core.activatePlugins(['lume-narrative-engine', 'lume-cloud']);

  // Pronto! Core + plugins rodando
  return core;
}
```

### 2. Plugin Emite Evento

```typescript
// Dentro de um plugin
export class MyPlugin implements IPlugin {
  async activate() {
    // Emitir evento
    await this.context.emitEvent(
      new ProjectCompiledEvent({
        projectId: '123',
        result: { ok: true, issues: [] },
        durationMs: 100
      })
    );
  }
}
```

### 3. Outro Plugin Subscreve

```typescript
export class ListenerPlugin implements IPlugin {
  async activate() {
    // Subscrever (type-safe)
    this.context.on(ProjectCompiledEvent, async (evt) => {
      console.log(`Project ${evt.data.projectId} compiled in ${evt.data.durationMs}ms`);
    });
  }
}
```

### 4. Plugin Consome Capability (RPC)

```typescript
export class ConsumerPlugin implements IPlugin {
  async activate() {
    // Obter serviço de outro plugin
    const engine = this.context.getService<NarrativeEngine>('NarrativeEngine', '1.0');
    
    // Usar (type-safe)
    const result = await engine.compileProject(project);
  }
}
```

## Princípios

### P1: Type-Safety
- Eventos são `TypedEvent<T>` — não há strings mágicas
- Handlers validam schema automaticamente
- Services são generic types: `getService<T>(name)`

### P2: Isolamento Estrito
- Plugins NÃO podem importar código um do outro
- ESLint bloqueia imports cruzados
- Toda comunicação via EventBus ou Capability RPC
- Erro em plugin A não afeta plugin B (ErrorBoundary)

### P3: Contratos Explícitos
- Cada plugin publica manifest com:
  - Capabilities oferecidas
  - Capabilities consumidas
  - Versão semver
- Core valida dependências no boot

### P4: Comunicação Assíncrona
- EventBus é async
- Handlers executam em sequência (respeitando prioridade)
- Sem callbacks, sem promise chains cruzadas

## Contratos (Tipos Públicos)

### TypedEvent

```typescript
export abstract class TypedEvent<T = any> {
  abstract readonly type: string;  // "lume:entity-interact"
  abstract readonly version: number;
  abstract readonly data: T;
}

// Exemplo
export class ProjectCompiledEvent extends TypedEvent<{
  projectId: string;
  result: CompileProjectResult;
}> {
  readonly type = 'lume:project-compiled';
  readonly version = 1;
}
```

### Plugin Manifest

```typescript
export interface IPluginManifest {
  name: string;
  version: string;
  capabilities?: {
    provides?: Capability[];
  };
  requires?: {
    mandatory?: Capability[];
    optional?: Capability[];
  };
  hooks?: {
    init?: () => Promise<void>;
    destroy?: () => Promise<void>;
  };
}
```

### CoreAPI (o que cada plugin recebe)

```typescript
export interface CoreAPI {
  emitEvent<T>(event: TypedEvent<T>): Promise<void>;
  on<T>(
    eventType: TypedEventConstructor<T>,
    handler: (event: T) => void | Promise<void>,
    options?: { once?: boolean; priority?: 'high' | 'normal' | 'low' }
  ): () => void;
  getService<T>(name: string, version?: string): T;
  logger: Logger;
  storage: PluginStorage;
  diagnostics: DiagnosticsAPI;
}
```

## Exemplo: Criar um Plugin

**Arquivo**: `src/plugins/example-plugin/manifest.ts`

```typescript
import type { IPluginManifest } from '@/core/contracts/plugin-manifest';

export const EXAMPLE_PLUGIN_MANIFEST: IPluginManifest = {
  name: 'lume-example-plugin',
  version: '1.0.0',
  description: 'Example plugin',
  capabilities: {
    provides: [
      { name: 'ExampleService', version: '1.0.0' }
    ]
  },
  requires: {
    mandatory: [
      { name: 'NarrativeEngine', version: '1.0.0' }
    ]
  },
  hooks: {
    init: async function() {
      console.log('Example plugin initialized');
    }
  }
};
```

**Arquivo**: `src/plugins/example-plugin/index.ts`

```typescript
import type { IPlugin, PluginContext } from '@/core/contracts/plugin-manifest';
import { EXAMPLE_PLUGIN_MANIFEST } from './manifest';
import { EntityInteractEvent } from '@/core/contracts/typed-event';

export interface ExampleService {
  doSomething(input: string): Promise<string>;
}

export class ExamplePlugin implements IPlugin {
  manifest = EXAMPLE_PLUGIN_MANIFEST;

  constructor(private context: PluginContext) {}

  async activate() {
    // Registrar capability
    this.context.getService('CapabilityRegistry').register({
      name: 'ExampleService',
      version: '1.0.0',
      provider: 'lume-example-plugin',
      api: {
        doSomething: this.doSomething.bind(this)
      }
    });

    // Subscrever a eventos
    this.context.on(EntityInteractEvent, async (evt) => {
      this.context.logger.info(`Entity ${evt.data.entityId} interacted`);
    });

    this.context.logger.info('Example plugin activated');
  }

  async deactivate() {
    this.context.logger.info('Example plugin deactivated');
  }

  private async doSomething(input: string): Promise<string> {
    return `Processed: ${input}`;
  }
}

export function createExamplePlugin(context: PluginContext): IPlugin {
  return new ExamplePlugin(context);
}
```

**Uso**:

```typescript
import { createCore } from '@/core';
import { EXAMPLE_PLUGIN_MANIFEST } from '@/plugins/example-plugin/manifest';
import { createExamplePlugin } from '@/plugins/example-plugin';

async function boot() {
  const core = createCore();
  
  core.registerPlugin(EXAMPLE_PLUGIN_MANIFEST, createExamplePlugin);
  await core.activatePlugin('lume-example-plugin');
  
  const service = core.getService<ExampleService>('ExampleService');
  const result = await service.doSomething('hello');
  console.log(result);  // "Processed: hello"
}
```

## Eventos Base (Lume)

### Narrative Engine

- `ProjectCompiledEvent` — compilação de projeto
- `GameCreatedEvent` — preview iniciado
- `GameBeatGeneratedEvent` — turn gerado
- `GameErrorEvent` — erro no motor

### Cloud Storage

- `ProjectSavedEvent` — projeto persistido
- `ProjectLoadedEvent` — projeto carregado

### IDE

- `EntityInteractEvent` — user clicou em entidade
- `UserEditedSourceEvent` — user editou código
- `UserClickedPlayEvent` — user clicou em Play
- `UserClickedRewindEvent` — user clicou em Rewind

## Testes

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createCore } from '@/core';
import { ProjectCompiledEvent } from '@/core/contracts/typed-event';

describe('Core', () => {
  let core: Core;

  beforeEach(() => {
    core = createCore();
  });

  it('emits events', async () => {
    let received: ProjectCompiledEvent | null = null;

    // Fake plugin que subscreve
    core.registerPlugin(
      { name: 'listener', version: '1.0.0' },
      (ctx) => ({
        manifest: { name: 'listener', version: '1.0.0' },
        context: ctx,
        activate: async () => {
          ctx.on(ProjectCompiledEvent, (evt) => {
            received = evt;
          });
        },
        deactivate: async () => {}
      })
    );

    await core.activatePlugin('listener');

    // Emitir evento
    await core.activatePlugin('emitter'); // outro plugin
    // ... emitter emits ProjectCompiledEvent

    // Validar
    expect(received).toBeDefined();
  });
});
```

## Diagnostics (Debug)

```typescript
const diagnostics = core.getDiagnostics();
console.log(diagnostics);
// {
//   plugins: [
//     { name: 'narrative-engine', version: '1.0.0', state: 'active', capabilities: ['NarrativeEngine@1.0.0'] },
//     { name: 'cloud', version: '1.0.0', state: 'active', capabilities: ['ProjectCloud@1.0.0'] }
//   ],
//   subscriptions: [
//     { eventType: 'lume:project-compiled', handlerCount: 2, plugins: ['ide', 'logger'] }
//   ],
//   isolatedPlugins: [],
//   capabilities: [
//     { name: 'NarrativeEngine', version: '1.0.0', provider: 'narrative-engine' }
//   ]
// }
```

## Próximas Fases

1. **Fase 1**: Implementar primeiro plugin (Narrative Engine)
   - Extrair `src/lib/engine/` → `src/plugins/narrative-engine/`
   - Testar paridade com código antigo

2. **Fase 2**: Outros plugins (Cloud, IDE UI, Store, etc.)
   - Mesma estratégia: Strangler Fig Pattern

3. **Fase 3**: Remover código monolítico

---

**Status**: ✅ Core Foundation Complete  
**Próximo**: Começar Fase 1 (Narrative Engine Plugin)
