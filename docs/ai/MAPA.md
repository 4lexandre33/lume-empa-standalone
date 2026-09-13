# Mapa Lume EMPA

Fonte canónica da ordem de boot: `src/bootstrap.ts`.
Este ficheiro é o **índice**. Código vive nos plugins.

## Kernel (`src/core/`)

| Peça | Ficheiro | Função |
|------|----------|--------|
| Core | `src/core/index.ts` | `createCore`, activate plugins |
| EventBus | `src/core/internal/event-bus.ts` | `emitEvent` / `on` |
| Capabilities | `src/core/internal/capability-registry.ts` | `registerCapability` / `getService` |
| Eventos | `src/core/contracts/typed-event.ts` | classes `lume:…` |
| CONTEXT | `src/core/CONTEXT.md` | |

Plugins **não** se conhecem. Falam por capability (RPC) e evento (facto). Dívida: alguns `import` diretos de `*/lib` — não expandir.

## Boot (28 plugins)

```
narrative-engine
  → project-cloud → ide-state → intent-engine
  → rule-semantics → world-events → knowledge → agency → spatial → senses → kit-adventure → kit-social → kit-channel → kit-combat → kit-prose → sift → dry-run → process → chain → life → nlp → notebook
  → ide-ui → ide-guide → ide-settings → entity-extras → multiplayer → ext-host
```

## Capabilities

| Capability | Plugin | Ficheiro da API |
|------------|--------|-----------------|
| NarrativeEngine | lume-narrative-engine | `src/plugins/narrative-engine/index.ts` |
| Taxonomy | lume-narrative-engine | idem |
| QueryEngine | lume-narrative-engine | idem |
| LanguageTools | lume-narrative-engine | idem |
| RuleEffects | lume-narrative-engine | `src/plugins/narrative-engine/lib/rule-effects.ts` |
| IntentEngine | lume-intent-engine | `src/plugins/intent-engine/index.ts` |
| IntentCatalog | lume-intent-engine | `src/plugins/intent-engine/lib/catalog.ts` |
| RuleSemantics | lume-rule-semantics | `src/plugins/rule-semantics/lib/classify.ts` |
| WorldEvents | lume-world-events | `src/plugins/world-events/index.ts` |
| Knowledge | lume-knowledge | `src/plugins/knowledge/lib/store.ts` |
| Agency | lume-agency | `src/plugins/agency/index.ts` |
| Spatial | lume-spatial | `src/plugins/spatial/lib/space.ts` |
| Senses | lume-senses | `src/plugins/senses/lib/senses.ts` |
| AdventureKit | lume-kit-adventure | `src/plugins/kit-adventure/lib/kit.ts` |
| SocialKit | lume-kit-social | `src/plugins/kit-social/lib/kit.ts` |
| ChannelKit | lume-kit-channel | `src/plugins/kit-channel/lib/kit.ts` |
| CombatKit | lume-kit-combat | `src/plugins/kit-combat/lib/kit.ts` |
| Prose | lume-kit-prose | `src/plugins/kit-prose/lib/recap.ts` |
| Sift | lume-sift | `src/plugins/sift/lib/sift.ts` |
| DryRun | lume-dry-run | `src/plugins/dry-run/lib/dry-run.ts` |
| Process | lume-process | `src/plugins/process/lib/process.ts` |
| Chain | lume-chain | `src/plugins/chain/lib/chain.ts` |
| Life | lume-life | `src/plugins/life/lib/life.ts` |
| Nlp | lume-nlp | `src/plugins/nlp/lib/nlp.ts` |
| Notebook | lume-notebook | `src/plugins/notebook/lib/notebook.ts` |
| IdeState / IdeStore | lume-ide-state | `src/plugins/ide-state/lib/orchestrator.ts` |
| IdeUI / IdeComponents | lume-ide-ui | `src/plugins/ide-ui/` |
| ProjectCloud / ProjectHistory | lume-project-cloud | `src/plugins/project-cloud/lib/persistence.ts` |
| IdeGuide | lume-ide-guide | `src/plugins/ide-guide/` |
| IdeSettingsService | lume-ide-settings | `src/plugins/ide-settings/` |
| EntityExtras | lume-entity-extras | `src/plugins/entity-extras/` |
| ExtHost | lume-ext-host | `src/plugins/ext-host/index.ts` |
| Multiplayer | lume-multiplayer | `src/plugins/multiplayer/` |

## Eventos kernel

| type | classe | quem emite | quem deve ouvir |
|------|--------|------------|-----------------|
| `lume:project-compiled` | ProjectCompiledEvent | narrative-engine async | ide |
| `lume:game-created` | GameCreatedEvent | narrative-engine async | ide |
| `lume:game-beat` | GameBeatGeneratedEvent | narrative **async** + **ide-state** (preview sync) | ide-ui |
| `lume:entity-interact` | EntityInteractEvent | — | ide-ui (log) |
| `lume:world-event` | WorldEventOccurredEvent | world-events (EMIT) | — |
| `lume:knowledge-updated` | KnowledgeUpdatedEvent | knowledge (KNOW) | — |
| `lume:intent-dispatched` | IntentDispatchedEvent | agency (INTENT no DO) | — |
| `lume:game-error` | GameErrorEvent | vários | — |
| `lume:ext-plugin` | ExternalPluginEvent | ext-host (guest emit) | guests / IDE |
| `lume:story-sifted` | StorySiftedEvent | sift (após beat, padrão completo) | preview banner |

Preview **não** passa por `interactAsync`. Efeitos de `DO` têm de correr em `interactWith` (registry `RuleEffects`).

## Domínio narrativo (não mexer no match)

```
Pedido do jogador
  → IntentEngine.parse/resolve/execute
  → (action) anota JOGADOR.intent* → NarrativeEngine.interact
  → findMatchingRule + applyChanges + RuleEffects (EMIT/KNOW/INTENT)
  → (perceive/cognize) presentIntent, mundo intacto
  → (dry-run) mesmo matcher + applyChanges no clone; vivo intacto; efeitos listados
  → (process) WAIT/TICK; remaining no mundo; TICK chama interact nos due
  → (chain) THEN id / `a; b` — mesmo interact/execute, sem segundo matcher
  → (life) LIVE / LIVE id — agentes `vivo` no mesmo sítio reagem no beat; opt-in; mesmo matcher
  → (kit) take/drop/… e talk/ask/tell/bye — dados; autor ganha por especificidade
  → (kit-social) mood, relation, memory — dados; talk/attack só se `mood` existir
  → (kit-channel) `tags: channel` + `state`; THEN no canal; opt-in `applyChannelKit`
  → (kit-combat) hp/force, `hostile`/`mortal`/`dead`; attack `$.hp-JOGADOR.force`; opt-in `applyCombatKit`
  → (kit-prose) `FUNCAO:`; `narrativa:` por voz; `Prose.recap` lê history
  → (sift) `PADRAO` sobre `history`; `game.sifted` reconstruído; banner; `lume:story-sifted`
  → (sessão) `createGame(..., { seed })`; JSON `{ seed, initialWorld, triggerIds }`; Skein
  → (mapa) `graphOf` sobre `exit_*` + `in`; SVG; clique → entidade
  → (beat) `lastBeat`: intent, regra, candidatos, efeitos, vivo
  → (índice) salas/objectos/agentes/regras/traits/canais/padrões; W010–W013
  → (play) vista sem IDE; `>`; aviso dry-run; banner; fallback humano
  → (partilha) HTML play-skin; `#play=` bundle; `#sessao=` replay; `.lume.json` / `.sessao.json`
  → (caderno) `notebooksSource`; `compileNotebook("")` vazio; capability `Notebook`
  → (nlp) frase livre → `intent.*` se não for pontilhado; falha fechado
```

| Conceito | Onde |
|----------|------|
| WorldModel / Entity | `narrative-engine/lib/types.ts`, `world-model.ts` |
| ON/IF/DO parse + match | `narrative-engine/lib/rule-engine.ts` |
| CREATE/DESTROY no DO | `rule-engine.ts` `applyChanges` |
| EffectOp EMIT/INTENT/KNOW/WAIT/TICK/THEN/LIVE | `rule-engine.ts` parseDoLine → `rule-effects.ts` |
| Runtime / rewind | `narrative-engine/lib/runtime.ts` |
| Dry-run | `narrative-engine/lib/dry-run.ts` + capability `DryRun` |
| Process WAIT/TICK | `process/lib/process.ts` |
| Chain THEN | `chain/lib/chain.ts` |
| Life LIVE | `life/lib/life.ts` |
| SocialKit mood/relation | `kit-social/lib/kit.ts` |
| ChannelKit channel/state | `kit-channel/lib/kit.ts` |
| CombatKit hp/force/dead | `kit-combat/lib/kit.ts` |
| Prose voz/FUNCAO/recap | `kit-prose/lib/recap.ts`, `kit-prose/data/functions.ts` |
| Sift PADRAO/history/banner | `narrative-engine/lib/sift.ts` + `sift/` |
| Seed / sessão / Skein | `narrative-engine/lib/session.ts`, `lib/skein.ts`, `ide-ui/.../Skein.tsx` |
| Mapa espacial | `spatial/lib/map.ts` + `ide-ui/lib/components/WorldMap.tsx` |
| Debug de beat | `narrative-engine/lib/beat.ts` + `ide-ui/lib/components/BeatDebug.tsx` |
| Índice / becos | `narrative-engine/lib/world-index.ts` + `ide-ui/lib/components/WorldIndex.tsx` |
| Play-skin | `ide-ui/lib/components/PlaySkin.tsx` + `CommandBar` `>` |
| Partilha play/sessão | `narrative-engine/lib/play-bundle.ts` + `ide-ui/lib/play-html.ts` |
| Caderno (C1) | `notebook/lib/notebook.ts` — compile vazio; `project.notebooksSource` |
| Nlp frase → intent.* | `nlp/lib/nlp.ts` |
| Taxonomia | `taxonomy.ts` |
| Query | `query.ts` |
| Catálogo intent | `intent-engine/lib/catalog.ts` |
| Classificar regra | `rule-semantics/lib/classify.ts` — **não entra no match** |
| Sidebar pastas | `ide-state/lib/tree.ts` + `ide-ui/.../ProjectTree.tsx` |
| CommandBar | `ide-ui/lib/components/CommandBar.tsx` |

## DSL (idioma Lume, não Elm)

```
ON: PORTA
IF: JOGADOR.intent=open
DO: PORTA.aberta
    CREATE FUMACA.event.current_location=$
    DESTROY TRAVA
    EMIT porta_aberta
    KNOW JOGADOR.PORTA
    INTENT GOBLIN.attack.JOGADOR
    WAIT 3.FUSE_PORTA
    TICK
    THEN CORREDOR
    LIVE
    LIVE GOBLIN
SEMANTIC: agency, constraint, transformation
narrativa: "…"
```

MODIFY/RELATE já eram tags/stats/links. Sem `MODIFY(x)`, sem `INTENT(open_door)`.

## Plano pós-S8

Experiência jogador/autor e tradução Allegory → [PLANO-EXPERIENCIA.md](PLANO-EXPERIENCIA.md). Não copiar 12 motores.
