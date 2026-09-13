# lume-agency

Dono do verbo `INTENT` no DO. Dispara IntentEngine (`source: script`). Sem tick autónomo.

## Abrir
- `lib/command.ts` — `GOBLIN.attack.JOGADOR` → `intent.action.interact.attack.JOGADOR`
- `index.ts` — handler `intent`

## Provides
Agency

## Requires
IntentEngine, RuleEffects

## Eventos
Emite `lume:intent-dispatched`

## Não fazer
- Não loop de NPC / `tick` autónomo — reacção no beat → `life` (`LIVE`)
- Intent inválido não muta o mundo (`execute` já revalida)

## Fora de âmbito
Catálogo e resolver → `intent-engine`. Vida local → `life`.
