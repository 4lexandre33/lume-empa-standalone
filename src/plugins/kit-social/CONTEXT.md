# lume-kit-social

Pacote de **dados**: humor, relação, memória. Não é motor.

## Abrir
- `data/relations.ts` — categorias TDRS (`stranger`…`enemy`)
- `lib/kit.ts` — `SOCIAL_TAXONOMY`, `SOCIAL_RULES`, `applySocialKit`

## Provides
SocialKit

## Requires
NarrativeEngine (para o autor compilar o projecto)

## Idioma
```
GUARDA.{ tags: agent; stats: mood=1; links: rel=REL_JOGADOR_GUARDA; }
REL_JOGADOR_GUARDA.{ tags: relation, acquaintance; stats: affinity=40; links: from=JOGADOR, to=GUARDA; }
LORE.{ tags: memory; }

DO: KNOW GUARDA.LORE
```
Stat `mood` no agente (opt-in: sem `mood` as regras sociais não casam). Entidade `relation` com `from`/`to` e `affinity`. Link `rel` no agente aponta para a relação com o jogador. `memory → information`. Autor escreve `KNOW` no facto; o kit não é KnowledgeEngine.

Falar (`talk`/`communicate`) com `mood>=0`: `mood+1` e `affinity+1`. Contar (`tell`): só `affinity+1`. Atacar: `mood - 1` (a regra é `ON: *.agent`; o catálogo de `attack` continua a listar monstros). Sem `rel`, o `affinity+1` é ignorado. Sem `vivo`/`LIVE` — isso é E1.

## Não fazer
- Não alterar `findMatchingRule`
- Não migrar Caverna/Planetário
- Não npcsts, Greet/Joke, FearEngine, ConversationEngine
- Não primitivas FEAR/FLEE
- Não tick, NLP, combate (E4)

## Fora de âmbito
talk/ask/tell fallback sem mood → `kit-adventure`. KNOW runtime → `knowledge`. Vida → `life`. Canais → `kit-channel`. Combate → `kit-combat`.
