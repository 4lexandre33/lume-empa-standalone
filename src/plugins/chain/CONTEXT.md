# lume-chain

Cadeia causal no **mesmo** `interactWith`. Não é segundo motor.

## Abrir
- `lib/chain.ts` — `follow` (interact de um id existente)
- `index.ts` — handler `THEN`

## Provides
Chain

## Requires
NarrativeEngine, RuleEffects

## Idioma
```
DO: THEN CORREDOR
DO: THEN $
```
`THEN id` chama o mesmo `interact(id)`. Não cria entidade. Não é `EMIT` (evento) nem `INTENT` (catálogo).

Comandos compostos (`intent.a; intent.b`) → `intent-engine` (`splitCommands`), o mesmo `executeIntent`.

## Não fazer
- Não segundo `findMatchingRule`
- Não auction Allegory (PASS/COMPLETED/REJECTED)
- Não Systems vs Laws
- Não auto-TICK (autor opta com `DO: TICK`)
- Não tick autónomo de NPC
- Não TIME() Elm, não Inspector

## Fora de âmbito
WAIT/TICK → process. EMIT → world-events. INTENT → agency. LIVE → life.
