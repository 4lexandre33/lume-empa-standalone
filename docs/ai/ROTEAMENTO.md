# Roteamento pedido → ficheiro

A IA consulta esta tabela **antes** de grep. Uma linha basta.

## Produto / UI

| Se o pedido fala de | Plugin | Abrir |
|---------------------|--------|-------|
| sidebar, árvore, ENTITIES, RULES, pastas | ide-ui + ide-state | `ide-ui/lib/components/ProjectTree.tsx`, `ide-state/lib/tree.ts` |
| preview, CommandBar, autocomplete, intent. | ide-ui + intent-engine | `CommandBar.tsx`, `PreviewPane.tsx`, `intent-engine/lib/resolver.ts` |
| editor de fonte, tabs entidades/regras | ide-ui | `SourceEditor.tsx`, `IdeApp.tsx` |
| inspector, query | ide-ui | `Inspector.tsx` |
| guia / slides | ide-guide | `ide-guide/lib/guide.ts` |
| settings IDE | ide-settings | `ide-settings/` |
| persistir projeto, cloud | project-cloud | `project-cloud/lib/persistence.ts` |
| extras nome/descrição | entity-extras | `entity-extras/` |
| multiplayer | multiplayer | `multiplayer/lib/p2p.ts` |
| plugin externo, sandbox, kit de plugins, download kit | ext-host | `ext-host/lib/kit.ts`, `ext-host/lib/registry.ts`, ConfigPane |

## Motor / regras / intent

| Se o pedido fala de | Plugin | Abrir |
|---------------------|--------|-------|
| ON IF DO, matcher, especificidade | narrative-engine | `lib/rule-engine.ts` |
| interact, rewind, beat, cycleIndex | narrative-engine | `lib/runtime.ts` |
| entidades, tags, links, spawn | narrative-engine | `lib/world-model.ts` |
| taxonomia `a → b` | narrative-engine | `lib/taxonomy.ts` |
| query `*.monster` | narrative-engine | `lib/query.ts` |
| CREATE / DESTROY no DO | narrative-engine | `rule-engine.ts` applyChanges |
| EMIT, evento diegético | world-events | `world-events/index.ts` |
| KNOW, o que o agent sabe | knowledge | `knowledge/lib/store.ts` |
| INTENT no DO, NPC dispara comando | agency | `agency/lib/command.ts`, `agency/index.ts` |
| contenção, `in`/`on`/`held_by`/`worn_by`, `exit_*`, connector | spatial | `spatial/lib/space.ts` |
| scope, visão, `can_see`, `dark`, container opaco | senses | `senses/lib/senses.ts` |
| kit adventure, take/drop/put/open/go, conversa, talk/ask/tell/bye, topic | kit-adventure | `kit-adventure/lib/kit.ts` |
| kit social, mood, affinity, relation, memory, acquaintance | kit-social | `kit-social/lib/kit.ts`, `kit-social/data/relations.ts` |
| kit channel, canal, economia, politica, facoes, applyChannelKit | kit-channel | `kit-channel/lib/kit.ts`, `kit-channel/data/channels.ts` |
| kit combate, hp, force, hostile, mortal, dead, applyCombatKit | kit-combat | `kit-combat/lib/kit.ts`, `kit-combat/data/combat.ts` |
| prosa, voz, FUNCAO, recap, flashback, confrontation | kit-prose | `kit-prose/lib/recap.ts`, `kit-prose/data/functions.ts` |
| sifting, PADRAO, história emergente, banner, story-sifted | sift | `narrative-engine/lib/sift.ts`, `sift/index.ts` |
| skein, seed, sessão, replay, playtest snapshot | narrative-engine + ide-ui + project-cloud | `narrative-engine/lib/session.ts`, `lib/skein.ts`, `ide-ui/lib/components/Skein.tsx` |
| mapa, salas, exit_n, grafo espacial, trizbort | spatial + ide-ui | `spatial/lib/map.ts`, `ide-ui/lib/components/WorldMap.tsx` |
| debug beat, candidatos, lastRule, spec, vivo | narrative-engine + ide-ui | `narrative-engine/lib/beat.ts`, `ide-ui/lib/components/BeatDebug.tsx` |
| índice, beco, topic, conv, canal, vivo sem regra | narrative-engine + ide-ui | `narrative-engine/lib/world-index.ts`, `ide-ui/lib/components/WorldIndex.tsx` |
| play-skin, vista jogador, >, dry-run, score | ide-ui + nlp | `ide-ui/lib/components/PlaySkin.tsx`, `intent-engine/lib/notices.ts` |
| export play, ligação sessão, #play, #sessao | narrative-engine + ide-ui | `narrative-engine/lib/play-bundle.ts`, `ide-ui/lib/play-html.ts` |
| dry-run, o que aconteceria, worldDiff | dry-run | `dry-run/lib/dry-run.ts`, `narrative-engine/lib/dry-run.ts` |
| process, WAIT, TICK, fuse, remaining | process | `process/lib/process.ts` |
| cadeia, THEN, comando composto `;` | chain + intent-engine | `chain/lib/chain.ts`, `intent-engine/lib/parser.ts` splitCommands |
| vida, LIVE, vivo, reacção no beat | life | `life/lib/life.ts` |
| nlp, frase, "pega a tocha", language profile, can i | nlp | `nlp/lib/nlp.ts` |
| classificar CONSTRAINT etc. | rule-semantics | `rule-semantics/lib/classify.ts` |
| parse `intent.action…` | intent-engine | `lib/parser.ts`, `lib/catalog.ts` |
| resolver / autocomplete contextual | intent-engine | `lib/resolver.ts`, `lib/complete.ts` |
| execute, JOGADOR.intent, limpeza | intent-engine | `lib/adapter.ts` |
| perceive / cognize sem mutar | intent-engine | `lib/present.ts` |
| botão do preview → comando | intent-engine | `lib/choice.ts` |
| RuleEffects registry | narrative-engine | `lib/rule-effects.ts` |
| exemplos caverna / planetário | narrative-engine | `lib/examples.ts` |
| manifesto Rule System | — | **não copiar**. Ver `docs/ai/INVARIANTES.md` |
| experiência jogador/autor, Allegory 12 camadas, plano En | — | `docs/ai/PLANO-EXPERIENCIA.md` — traduzir, não copiar motores |

## Palavras-chave DSL

| Token | Dono |
|-------|------|
| `ON:` `IF:` `DO:` `NARRATIVA:` | rule-engine.ts |
| `SEMANTIC:` | rule-engine parse + rule-semantics classify |
| `CREATE` `DESTROY` | rule-engine applyChanges |
| `EMIT` | world-events |
| `KNOW` | knowledge |
| `INTENT` (linha de DO) | agency |
| `WAIT` `TICK` | process |
| `THEN` | chain |
| `LIVE` | life |
| `intent.action.` `intent.perceive.` `intent.cognize.` | intent-engine catalog/parser |
| `JOGADOR.intent=` | adapter + matcher (já existe) |
