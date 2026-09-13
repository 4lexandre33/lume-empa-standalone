# lume-rule-semantics

Classifica regras. Zero execução.

## Abrir
- `lib/classify.ts` — `classifyRule`

## Provides
RuleSemantics

## Requires
NarrativeEngine

## Não fazer
- Não chamar classify a partir de `findMatchingRule`
- Não criar plugin por categoria (ConstraintEngine etc.)
- Autor `SEMANTIC:` une-se à inferência; nunca substitui o DO
- WAIT/TICK inferem `process`

## Fora de âmbito
Sidebar agrupa por `classify` em `ide-state/lib/tree.ts`, não aqui.
