# lume-intent-engine

Língua `intent.*`: parse, catálogo, resolver, execute, choice, autocomplete.

## Abrir
- `lib/catalog.ts` — famílias perceive/cognize/action
- `lib/parser.ts` — parse puro
- `lib/resolver.ts` — mundo + taxonomia + regras
- `lib/adapter.ts` — execute; anota `intent*`; action chama interact
- `lib/present.ts` — perceive/cognize sem mutar mundo
- `lib/choice.ts` / `lib/complete.ts`

## Provides
IntentEngine, IntentCatalog

## Requires
NarrativeEngine, Taxonomy, QueryEngine. Opcional IdeState, Senses (`options.scope`).

## Não fazer
- Perceive/cognize não chamam `interact`
- Não persistir `actor.links.intent` depois do execute
- Não adicionar família (SEARCH, PLAN, …) sem pedido + teste de catálogo
- NPC/script usam o **mesmo** `execute` (`source`, `actor`)
- `a; b` = `splitCommands` + o mesmo execute. Sem segundo parser de NLP
- `ask`/`tell`/`bye` são folhas de `interact`, não uma família nova
- Frase livre **não** vive aqui: `registerPhraseMapper` é o gancho. Dono → `nlp`

## Fora de âmbito
`DO: INTENT` → `agency`. `DO: THEN` → `chain`. KNOW de regra → `knowledge`. CommandBar UI → `ide-ui`. Frase → `nlp`.
