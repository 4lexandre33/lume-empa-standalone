# lume-world-events

Dono do verbo `EMIT` no DO. Evento diegético ≠ TypedEvent de plataforma.

## Abrir
- `index.ts` — handler `emit`
- `lib/events.ts` — garante entidade `tags: event` e encadeia `interact(id)`

## Provides
WorldEvents

## Requires
NarrativeEngine, RuleEffects

## Eventos
Emite `lume:world-event`

## Não fazer
- Não reimplementar match
- Loop EMIT limitado por `MAX_EFFECT_DEPTH` em `runtime.ts`
- Não usar TypedEvent como `ON:`

## Fora de âmbito
TIME() Elm não existe. PROCESS → `lume-process` (`WAIT` / `TICK`).
