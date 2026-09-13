# lume-kit-channel

Pacote de **dados**: canais globais. Não é motor. Não é ChannelEngine.

## Abrir
- `data/channels.ts` — `economia|politica|facoes`
- `lib/kit.ts` — `CHANNEL_TAXONOMY`, `CHANNEL_RULES`, `applyChannelKit`

## Provides
ChannelKit

## Requires
NarrativeEngine (para o autor compilar o projecto)

## Idioma
```
CORRUPCAO.{ tags: channel, economia; stats: state=0; }

ON: GUARDA
IF: JOGADOR.intent=give
DO: THEN CORRUPCAO

ON: CORRUPCAO
IF: CORRUPCAO.intent=advance
DO: CORRUPCAO.corrupted
    THEN CIDADE
```
Tag `channel → abstract`. Stat `state` (opt-in: sem `state` as regras do kit não casam). Query `*.channel`. Avanço: `THEN CORRUPCAO` (interact, kit faz `state+1`) ou `$.intent=advance` no canal. Autor escreve `THEN CIDADE`; o kit **não** THEN outro canal.

`economia|politica|facoes` são dados no kit; só entram no projecto com `applyChannelKit`.

## Não fazer
- Não alterar `findMatchingRule`
- Não migrar Caverna/Planetário
- Não máquina de estados noutro runtime
- Não um canal escrever noutro
- Não auto-advance por relógio / WAIT / TICK / TIME()

## Fora de âmbito
THEN runtime → `chain`. INTENT no DO → `agency`. Fusível → `process`. Vida local → `life`. Combate → `kit-combat`.
