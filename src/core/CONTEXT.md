# lume-core

Microkernel: EventBus, PluginRegistry, CapabilityRegistry. Sem lógica de jogo.

## Abrir
- `index.ts` — `createCore`
- `contracts/typed-event.ts` — novos `lume:…`
- `contracts/plugin-manifest.ts` — forma do manifest
- Nunca `internal/` a não ser bug de registry/bus

## Provides
Nenhum (é o host).

## Não fazer
- Não pôr regras, world model ou UI no core
- Novo evento: classe em `typed-event.ts`, não schema obrigatório
- Não unificar os dois tipos `GameBeat` (contrato vs runtime)

## Fora de âmbito
Jogo → `narrative-engine`. Intent → `intent-engine`.
