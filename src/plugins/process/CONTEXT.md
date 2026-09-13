# lume-process

Dono de `WAIT` e `TICK` no DO. Tempo Lume = turnos (`remaining`), não relógio.

## Abrir
- `lib/process.ts` — `schedule` / `tick` / `listProcesses`
- `index.ts` — handlers `wait` e `tick`

## Provides
Process

## Requires
NarrativeEngine, RuleEffects

## Idioma
```
DO: WAIT 3.FUSE_PORTA
DO: TICK
```
`WAIT n.id` cria/atualiza entidade `tags: process` com `remaining=n`.
`TICK` decrementa; `remaining=0` faz `interact(id)` (o autor escreve o `ON:`).

## Não fazer
- Não `TIME(after 10 seconds)` Elm
- Não `setTimeout` / relógio de parede
- Não alterar `findMatchingRule`
- Não tick autónomo de NPC
- Não auto-TICK em todo `interact` — o autor opta com `DO: TICK`
- Não store paralelo: estado vive no WorldModel (rewind = replay)

## Fora de âmbito
EMIT → world-events. INTENT de NPC → agency. THEN → chain. LIVE → life. Dry-run não corre WAIT/TICK. Canais globais → `kit-channel`.
