# Glossário Lume (não Allegory, não Elm, não ECS)

Se um pedido usar a coluna da esquerda, traduzir e **não procurar** Component/Law/System no código.

| Pediram | Em Lume | Onde |
|---------|---------|------|
| Entity | `Entity` (tags, stats, links, extra) | `narrative-engine` world-model |
| Component | **não existe** — é tag / stat / link | — |
| Intent | comando `intent.*` **ou** `DO: INTENT` | intent-engine / agency |
| Law | **não existe** — é `Rule` ON/IF/DO | rule-engine |
| Rule | bloco ON/IF/DO + narrativa | rule-engine |
| System | **não existe** — é plugin + capability | manifest.ts |
| Event (plataforma) | `TypedEvent` `lume:…` | `core/contracts/typed-event.ts` |
| Event (diegético) | entidade `tags: event` via `EMIT` | world-events |
| Mutation | `ChangeAST` / `applyChanges` / EffectOp | rule-engine, rule-effects |
| Narration | campo `narrativa:` no beat | runtime |
| Transaction / rollback | **não existe** — rewind = replay de triggerId | runtime |
| ECS / archetype | **não existe** | — |
| NLP / embeddings | frase → `intent.*` via `Nlp.interpret`. Sem embeddings. Falha fechado | nlp |
| Save format | `Project` (sources + extras + settings) | project.ts / project-cloud |
| location / contents (TADS) | links `in`/`on`/`held_by`/`worn_by`; `current_location` alias de leitura de `in` | spatial |
| TravelConnector | `exit_n`… ou entidade `tags: connector` (`from`/`to`/`dir`) | spatial |
| Sense / scope / can_see (TADS) | derivado `Senses.scope` — **não** é link no mundo | senses |
| Adv3 / Worldkit | `AdventureKit` (regras+taxonomia Lume, opt-in `apply`) | kit-adventure |
| npcsts / TDRS / mood / relationship | `SocialKit`: stat `mood`; entidade `relation` + `affinity`; tag `memory`; `KNOW`. Sem motor | kit-social |
| multilinear / canal global | `ChannelKit`: tag `channel` + stat `state`; `THEN` no canal. Sem ChannelEngine, sem relógio | kit-channel |
| Ananke / ATTACK / combate | `CombatKit`: stats `hp`/`force`; tags `hostile`/`mortal`/`dead`/`weapon`. Sem física 20 Hz | kit-combat |
| sogh / Curveship / voz / recap | `Prose`: `FUNCAO:`; `narrativa:` por `extra.voice`; `recap(history)`. Sem Markov, sem GPL | kit-prose |
| Viv / Felt / sifting | `Sift`: `PADRAO` sobre `history[]`; `game.sifted` reconstruído; banner. Sem DataScript, sem `.viv` | sift |
| Ananke Replay / Inform Skein | `seed` em `createGame`; JSON `{ seed, initialWorld, triggerIds }`; UI `Skein`. Sem relógio de parede | runtime + ide-ui |
| Trizbort / mapa espacial | `graphOf` + SVG `WorldMap`. Lê `exit_*` e `in`. Clique abre a entidade. Sem editor Inform, sem gerar mundo | spatial + ide-ui |
| Debug L1–L11 | um painel `BeatDebug`: intent, `lastBeat.ruleId`, candidatos+spec, efeitos, vivo. Sem 12 motores | runtime + ide-ui |
| dramaturge / índice / beco | `buildWorldIndex` + W010 topic sem ask, W011 `links.conv`, W012 canal sem 2 estados, W013 vivo sem reacção. Sem gerador de regras | world-index |
| play-skin / Sharpee browser | `PlaySkin`: título, turno, score opcional, prosa, `>`, banner, aviso dry-run. Sem download nativo, sem embeddings | ide-ui |
| caderno / notebook / linguagem humana | `notebooksSource` + `compileNotebook`. C1: compile vazio. Não é segundo matcher. C2+ em [PLANO-CADERNO.md](PLANO-CADERNO.md) | notebook |
| ConvNode / TopicEntry / ASK ABOUT | tag `topic`; `talk`/`ask`/`tell`/`bye`; estado `falando`. Sem ConversationEngine | kit-adventure |
| Dry run / “can I” / transação | `DryRun.dryRun(state, triggerId)` — mesmo matcher, DO no clone, efeitos listados. Sem rollback, sem NLP | dry-run |
| TIME / fuse / daemon / tick | `WAIT n.id` + `TICK`; entidade `tags: process` + `remaining`. Sem relógio, sem `TIME()` Elm | process |
| Cadeia / Systems / auction | `THEN id` + `intent.a; intent.b`. Um só `findMatchingRule`. Sem Laws | chain |
| Vida / npcsts tick / reacção | `LIVE` / `LIVE id`; tag `vivo`. Mesmo `interact`. Sem relógio, sem FearEngine | life |

Termos que **existem** e não traduzir: Capability, Plugin, Taxonomy, Query, Beat, EffectOp, SemanticKind, CommandBar, `knows_<id>`, `in`, `on`, `held_by`, `worn_by`, DryRun, `WAIT`, `TICK`, `remaining`, `THEN`, `LIVE`, `vivo`, `topic`, `falando`, `mood`, `affinity`, `relation`, `memory`, `channel`, `hp`, `force`, `hostile`, `mortal`, `dead`, `FUNCAO`, `voice`, `PADRAO`, seed, Skein, Nlp.
