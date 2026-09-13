# lume-ide-ui

UI canónica do IDE. Fonte da verdade dos componentes.

## Abrir
- `lib/components/ProjectTree.tsx` — sidebar ENTITIES/RULES/pastas
- `lib/components/CommandBar.tsx` — autocomplete `intent.`
- `lib/components/PreviewPane.tsx` — preview + slot do CommandBar
- `lib/components/Skein.tsx` — árvore de `history` + ramos
- `lib/components/WorldMap.tsx` — SVG de salas a partir de `exit_*` / `in`
- `lib/components/BeatDebug.tsx` — intent, regra, candidatos, efeitos, vivo
- `lib/components/WorldIndex.tsx` — índice gerado + becos
- `lib/components/PlaySkin.tsx` — vista jogador (`>`), sem IDE
- `lib/components/NotebookPane.tsx` — vista caderno (C9): capa, índice, página, margem
- `lib/components/NotebookNotes.tsx` — notas do caderno (C8), prosa, sob o motor
- `lib/play-html.ts` — HTML estático do play-skin
- `lib/components/IdeApp.tsx` — layout; export/import `.lume.caderno.md`; `#play=` após compile do caderno
- `lib/view-registry.ts` — nomes das vistas (16)

## Provides
IdeUI, IdeComponents

## Requires
NarrativeEngine, ProjectCloud, IdeStore

## Não fazer
- Não copiar componentes para `src/components/ide/` (lá só `export { X } from plugins/...`)
- Não mostrar atalhos de escolha sempre visíveis; autocomplete só após `.`
- Não lógica de compile/interact aqui — store

## Fora de âmbito
Pastas persistidas → `ide-state/lib/tree.ts`. Resolver de intent → `intent-engine`.
