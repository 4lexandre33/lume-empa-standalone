# lume-project-cloud

Save/load de projetos e playtests.

## Abrir
- `lib/persistence.ts`

## Provides
ProjectCloud, ProjectHistory

## Eventos
`lume:project-saved|loaded|deleted`, playtest-*

Playtest snapshot (E7): `{ seed, initialWorld, triggerIds, tree }`. Ficheiro de sessão: `{ seed, initialWorld, triggerIds[] }`. Play estático: HTML + `#play=` / `#sessao=` (sem loja de 10k). Caderno: coluna `notebooks_source`.

## Não fazer
- Não lógica de compile aqui
- Não fórum; partilha = ficheiro
