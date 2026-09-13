# lume-sift

Padrões nomeados sobre o cronículo. Não é motor. Não muta o mundo.

## Abrir
- `../../narrative-engine/lib/sift.ts` — `parsePadrao` / `matchSift` / `bannerOf`
- `index.ts` — capability `Sift`, evento `lume:story-sifted`

## Provides
Sift

## Requires
NarrativeEngine

## Idioma
```
PADRAO corrupcao_guarda
  eventos: suborno, aceite, canal_corrupted
  nome: The Corruption of the Gate Guard
```
Depois de cada beat (não no matcher): subsequência ordenada de `triggerId` em `history`. A lista `game.sifted` reconstrói-se do history — não é store paralelo. Banner no Preview. `EMIT` cria o beat do evento.

## Não fazer
- Não alterar `findMatchingRule`
- Não DataScript, `.viv`, LLM
- Não mutar tags/stats/links
- Não dashboard de milhares de jogadores
- Não migrar Caverna/Planetário

## Fora de âmbito
EMIT runtime → `world-events`. Recap/voz → `kit-prose`. Index → E10. Play-skin → E11.
