# lume-kit-combat

Pacote de **dados**: hp, force, morte. Não é motor. Não é física.

## Abrir
- `data/combat.ts` — `weapon`, `hostile`, `mortal`
- `lib/kit.ts` — `COMBAT_TAXONOMY`, `COMBAT_RULES`, `applyCombatKit`

## Provides
CombatKit

## Requires
NarrativeEngine (para o autor compilar o projecto)

## Idioma
```
GOBLIN.{ tags: agent, hostile, mortal; stats: hp=3, force=1, mood=0; }
JOGADOR.{ tags: agent; stats: hp=10, force=1; }

DO: $.hp-JOGADOR.force
DO: $.dead
    EMIT morte
```
Stats `hp` / `force` (opt-in, convenção default 1). Tag `hostile` para o golpe; `mortal` para cair. `dead` é tag de estado. Atacar: `hp-force` e `mood - 1`. `hp<=0` → `dead` + `EMIT morte` no interact seguinte (ou no mesmo se `hp` já era 0).

`weapon|hostile|mortal` são dados no kit; só entram no projecto com `applyCombatKit`.

Léxico NLP (`kill` / `atacar` / `bater`) vive em `nlp`, não aqui.

## Não fazer
- Não alterar `findMatchingRule`
- Não migrar Caverna/Planetário
- Não Joules, ângulo, massa, Three.js, loop 20 Hz
- Não MODIFY Elm — `$.hp-JOGADOR.force` no parser de DO
- Não segundo matcher

## Fora de âmbito
EMIT runtime → `world-events`. Humor sem combate → `kit-social`. Vida → `life`. Frase `kill goblin` → `nlp`. Prosa/voz/recap → `kit-prose`.
