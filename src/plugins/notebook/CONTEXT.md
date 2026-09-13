# lume-notebook

Caderno humano. Compila para fontes Lume **fora** do matcher. C12: cache incremental + peso documental.

## Abrir
- `lib/notebook.ts` — `compileNotebook` / `slugOf`
- `lib/cache.ts` — hash por `###`; recompile só o sujo
- `lib/assist.ts` — `assistNotebook` → `{ notes }`
- `lib/pages.ts` — `parseCadernoLibrary` / `applyNotebookToProject`
- `lib/share.ts` — `exportCadernoMd` / `importCaderno`
- `lib/verbs.ts` — léxico NLP (folha take/open/…), sem importar nlp
- `index.ts` — capability `Notebook`

## Provides
Notebook

## Requires
(nenhum)

## Idioma
`peso: sala` na margem é comentário. Não altera especificidade. Não é leilão.

## Eficiência
1. **Beat:** inalterado. `findMatchingRule` + efeitos. O caderno **não** corre no interact.
2. **Compile:** hash por `###`. Texto igual → `dirty: []` (não recompila). Uma frase suja marca essa `###` e corre o compile uma vez — tear e LIVE precisam do índice inteiro. Títulos/`activa` mudam → as hashes mudam.
3. **Kits:** uma vez no boot do projecto.
4. **Índice / validação:** no compile, não no beat.
5. **Tecto:** `MAX_EFFECT_DEPTH` / `MAX_LIVE_PER_BEAT` no motor; W021 se regras > 500.
6. **Proibido:** 20 Hz, DataScript, WASM, segundo text-service, embeddings, leilão, `ContributionStatus`.

O mundo parece vivo porque **LIVE + canais + PADRAO** encadeiam. Não porque há física contínua.

## Não fazer
- Não leilão / ContributionStatus
- Não marketplace
- Não embeddings
- Não alterar `findMatchingRule`
- Não migrar caverna

## Fora de âmbito
Matcher / rewind / play → narrative-engine. Vista páginas → ide-ui.
