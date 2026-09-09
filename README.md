# Lume — Extensible Microkernel Platform Architecture (EMPA)

Versão autônoma, modular e desacoplada da plataforma Lume (nível VS Code).

## 📁 Estrutura de Diretórios

```text
lume-empa-standalone/
├── migrations/                     # Schemas de Banco de Dados (Postgres / PGLite)
├── src/
│   ├── index.ts                    # Entrypoint & SDK público da plataforma
│   ├── bootstrap.ts                # Bootstrap do Microkernel e ativação dos 8 plugins
│   ├── db/                         # Camada de conexão de banco de dados
│   ├── core/                       # MICROKERNEL ENGINE
│   │   ├── api.ts                  # Interface pública CoreAPI
│   │   ├── index.ts                # Fachada Core (createCore)
│   │   ├── logger.ts               # Logger com contexto do plugin
│   │   ├── contracts/              # Contratos, TypedEvent, Errors, Manifest
│   │   ├── internal/               # EventBus, Registries, ErrorBoundary, Semver
│   │   └── __tests__/              # Suíte de testes do Core
│   └── plugins/                    # OS 8 PLUGINS AUTÔNOMOS DO LUME
│       ├── narrative-engine/       # DSL ON/IF/DO, Compilador, Taxonomia, Parser, Runtime
│       ├── project-cloud/          # Persistência no banco, CRUD de projetos e playtests
│       ├── ide-state/              # Orquestrador reativo e store Zustand
│       ├── ide-ui/                 # Apresentação visual, 10 Vistas e menus
│       ├── ide-guide/              # Tutoriais interativos e referência de sintaxe
│       ├── ide-settings/           # Preferências, layout e idioma
│       ├── entity-extras/          # Metadados e propriedades visuais de entidades
│       └── multiplayer/            # Colaboração P2P WebRTC em tempo real
├── eslint.config.mjs
├── package.json
└── tsconfig.json
```

## 🚀 Comandos

```bash
# Executar todos os testes da plataforma
npm test

# Executar testes apenas do microkernel
npm run test:core

# Executar testes dos plugins
npm run test:plugins

# Verificação estrita de tipos
npm run typecheck

# Análise estática de código
npm run lint
```
