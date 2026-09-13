# lume-nlp

Frase livre → `intent.*`. Último no pipeline. Frágil: falha fechado.

## Abrir
- `lib/nlp.ts` — `interpret` / `splitPhrases`
- `index.ts` — regista phrase mapper no IntentEngine

## Provides
Nlp

## Requires
IntentEngine

## Idioma
```
pega a tocha
take torch
kill goblin
posso pegar a tocha
pega a tocha. espera
```
Só corre se o texto **não** começa por `intent`. Sai um comando pontilhado; o matcher não muda.

`posso` / `can i` → `dryRun: true` (não executa). Mensagem: «Pergunta hipotética: nenhuma acção foi executada.» Sem embeddings, sem Transformers, sem salience.

## Não fazer
- Não `findMatchingRule`
- Não embeddings / vector search / WASM NLP
- Não família nova de intent
- Não TIME, Inspector, tick NPC
- Não migrar exemplos
- Não autocomplete de frase

## Fora de âmbito
Parse pontilhado → intent-engine. Dry-run de `interact` → dry-run. `;` de `intent.a; intent.b` → chain.
