# lume-ide-state

Zustand: projeto aberto, compile, preview, persistência, **pastas da sidebar**.

## Abrir
- `lib/orchestrator.ts` — store, preview, skein, sessão
- `lib/tree.ts` — ENTITIES/RULES sections, folders, placements
- `types.ts` — IdeStore

## Provides
IdeState, IdeStore

## Requires
NarrativeEngine, ProjectCloud

## Não fazer
- Não duplicar store em `src/lib/ide/store.ts` (já reexporta)
- Pastas = `project.settings.tree`, não tags do world model
- Dívida: importa `narrative-engine/lib` e `intent-engine/lib`. Não acrescentar mais imports de plugin

## Fora de âmbito
Pixels da árvore → `ide-ui/.../ProjectTree.tsx`. Skein UI → `ide-ui/.../Skein.tsx`. JSON de sessão → `narrative-engine/lib/session.ts`. Mapa → `ide-ui/.../WorldMap.tsx`.
