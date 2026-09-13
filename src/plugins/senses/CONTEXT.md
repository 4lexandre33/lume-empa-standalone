# lume-senses

Scope derivado: visão, audição, toque. **Não** grava `can_see` no mundo.

## Abrir
- `lib/senses.ts` — `scope` / `visibleTo` / `audibleTo` / `reachableTo`
- Opaco: tag `container` e não `aberta`. Luz: `dark` / `illumination=0` no sítio; fonte `lit` ou `illumination>0`.

## Provides
Senses

## Requires
NarrativeEngine, Spatial

## Não fazer
- Não mutar tags/stats/links
- Não NLP / salience
- Não alterar `findMatchingRule` nem exemplos oficiais
- Não kit take/drop, não PROCESS

## Fora de âmbito
Contenção → `spatial`. Filtrar comando → `intent-engine` via `options.scope`.
