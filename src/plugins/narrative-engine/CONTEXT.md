# lume-narrative-engine

Único dono de mundo, taxonomia, query, compile, `ON/IF/DO`, `interact`, rewind.

## Abrir
- `lib/rule-engine.ts` — parse + `findMatchingRule` + CREATE/DESTROY
- `lib/rule-effects.ts` — registry de verbos DO (EMIT/KNOW/INTENT/…)
- `lib/runtime.ts` — `interactWith`, rewind
- `lib/dry-run.ts` — `dryRunWith` (mesmo matcher, sem mutar o vivo, sem RuleEffects)
- `lib/world-model.ts` — entidades
- `lib/taxonomy.ts` / `lib/query.ts`
- `lib/beat.ts` — `lastBeat` (intent, regra, candidatos, efeitos, vivo)
- `lib/world-index.ts` — índice + avisos de beco (topic/conv/canal/vivo)
- `lib/play-bundle.ts` — bundle play + hash `#play=` / `#sessao=`
- `lib/project.ts` — `notebooksSource` (caderno; compile vazio até C2)
- `types.ts` — contratos públicos

## Provides
NarrativeEngine, Taxonomy, QueryEngine, LanguageTools, RuleEffects

## Eventos
Emite (async): `lume:project-compiled`, `lume:game-created`, `lume:game-beat`, `lume:game-error`. Preview **não** usa async.

## Não fazer
- Não alterar `findMatchingRule` para semântica
- Não importar intent-engine / world-events / knowledge / agency
- Não implementar EMIT/KNOW/INTENT/WAIT/TICK/THEN/LIVE aqui — só `EffectOp` + registry
- Perceive/cognize não vivem aqui
- Dry-run como capability de domínio → `lume-dry-run` (chama `NarrativeEngine.dryRun`)

## Fora de âmbito
Classificar regra → `rule-semantics`. Comando digitado → `intent-engine`. Sidebar → `ide-ui`.
