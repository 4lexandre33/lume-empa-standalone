# lume-knowledge

Dono do verbo `KNOW`. Cognição do agent, não entidade `information`.

## Abrir
- `lib/store.ts` — tag `knows_<id>` no agent
- `index.ts` — handler `know`

## Provides
Knowledge

## Requires
NarrativeEngine, RuleEffects

## Eventos
Emite `lume:knowledge-updated`

## Não fazer
- Não gravar facto como entidade `information`
- Não misturar com `knownIdsFromHistory` do intent-engine (comandos perceive) sem pedido

## Fora de âmbito
PERCEIVE/COGNIZE de comando → `intent-engine/lib/present.ts`.
