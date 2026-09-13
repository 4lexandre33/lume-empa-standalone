# lume-life

Reacção local no **mesmo** beat. Não é segundo motor, não é tick de relógio.

## Abrir
- `lib/life.ts` — `live` (interact de um id, ou scan `vivo` no mesmo sítio)
- `index.ts` — handler `LIVE`

## Provides
Life

## Requires
NarrativeEngine, RuleEffects

## Idioma
```
DO: LIVE
DO: LIVE GOBLIN
```
`LIVE id` chama o mesmo `interact(id)` (id existente). `LIVE` sem args percorre entidades `tags: vivo` no mesmo sítio que o jogador (senão o trigger), ids ordenados, tecto `MAX_LIVE_PER_BEAT` (4). Exclui o jogador e o trigger. Sem `vivo` / sem `LIVE` na regra = nada (caverna intacta).

Não cria entidade. Não é `EMIT` (evento) nem `INTENT` (catálogo) nem `THEN` (cadeia da acção) nem `TICK` (fusível).

## Não fazer
- Não segundo `findMatchingRule`
- Não tick autónomo / relógio / auto-TICK
- Não loop de todos os agentes do mundo
- Não FearEngine / LifecycleEngine
- Não `TIME()` Elm, não Inspector
- Não migrar Caverna/Planetário
- Não `settings.life: auto` (autor opta com `DO: LIVE`)

## Fora de âmbito
INTENT no DO → agency. THEN → chain. WAIT/TICK → process. Scope visual → senses.
