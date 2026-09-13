# lume-kit-prose

Apresentação do beat. Não é gerador. Não é Curveship. Não é Markov.

## Abrir
- `data/functions.ts` — `confrontation` `transaction` `discovery` `curse` `revelation` `escalation`
- `lib/recap.ts` — `Prose.recap(history, { focalizer, order, limit })`

## Provides
Prose

## Requires
NarrativeEngine

## Idioma
```
NARRADOR.{ tags: abstract; voice: somber; }

FUNCAO: curse
narrativa: "A porta abre."
narrativa: somber: "A porta range."
```
`narrativa:` continua dona. Variantes por `cycleIndex` (`a|b`) e por `extra.voice` (trigger, depois JOGADOR, depois NARRADOR). `FUNCAO:` é etiqueta — **não** entra no score. Recap só lê `history[]` e devolve markdown. Flashback = `order: "reverse"`.

## Não fazer
- Não alterar `findMatchingRule`
- Não Markov, 8 estágios, WASM, LLM
- Não copiar Curveship (GPL)
- Não comentar a morte sozinho
- Não migrar Caverna/Planetário

## Fora de âmbito
Match ON/IF/DO → `narrative-engine`. Classificar SEMANTIC → `rule-semantics`. Sifting de padrões → `sift`.
