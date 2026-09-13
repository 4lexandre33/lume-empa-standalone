# lume-kit-adventure

Pacote de **dados**: taxonomia + regras genéricas de aventura e conversa. Não é motor.

## Abrir
- `lib/kit.ts` — `ADVENTURE_TAXONOMY`, `ADVENTURE_RULES`, `applyAdventureKit`

## Provides
AdventureKit

## Requires
NarrativeEngine (para o autor compilar o projecto)

## Idioma (conversa)
```
intent.action.interact.talk.NPC
intent.action.interact.ask.NPC.TOPICO
intent.action.interact.tell.NPC.TOPICO
intent.action.interact.bye.NPC
```
Tag `topic → information`. Convenção de estado: `falando` no agente. ConvNode = `links.conv` + regras do autor + `THEN`.

## Não fazer
- Não alterar `findMatchingRule`
- Não migrar Caverna/Planetário
- Não tick, sentidos, NLP
- Não ConversationEngine / ConvNode engine
- Não TakeEngine — o autor ganha por especificidade (`ON: PORTA_SANGRENTA`, `ON: GOBLIN`)

## Fora de âmbito
Contenção → spatial. Scope → senses. Catálogo de tokens `drop`/`put`/`ask`/`tell`/… → intent-engine. Humor/relação → `kit-social`.
