# lume-spatial

Dono da convenção de espaço: `in` / `on` / `held_by` / `worn_by`, alias de leitura `current_location` → `in`, travel `exit_*` e entidade `connector`.

## Abrir
- `lib/space.ts` — `contents`, `locationOf`, `deepContains`, `exits`, `destination`
- `lib/map.ts` — `graphOf` (salas + `exit_*` + `in`). Só lê.
- `types.ts` — `SpatialWorld` (compatível com `WorldModel`)

## Provides
Spatial

## Requires
NarrativeEngine (boot). Não chama o matcher.

## Não fazer
- Não mutar o mundo
- Não alterar `findMatchingRule` / `query.ts` / exemplos oficiais
- Não migrar `current_location` nas histórias (só alias de leitura)
- Não sentidos, tick, kit take/drop, NLP

## Fora de âmbito
Scope/luz → fase S2 (`lume-senses`). Regras genéricas take/open → kit adventure. SVG do mapa → `ide-ui/.../WorldMap.tsx`. Não gerar salas.
