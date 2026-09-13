# Plano Lume — Experiência Jogador + Autor

> Depois de S1–S8. Traduz a plataforma Allegory (12 camadas) e o documento *Experiência Completa — Jogador e Autor* para o **idioma Lume**.
> **Não é um segundo motor.** Um só `findMatchingRule`. Rewind = replay. Sem ECS, sem Laws, sem leilão, sem embeddings, sem LLM na narrativa.
>
> **Estado:** E1–E12 **feitas**. Caderno em linguagem humana → [PLANO-CADERNO.md](PLANO-CADERNO.md).

**Como usar este ficheiro:** cada fase En é um pedido futuro do tipo *«faça agora Fase En, de forma completa, sem mais e sem menos»*. Este plano **não implementa**. Só descreve.

---

## 0. Tese

O documento de experiência descreve *o que o jogador sente* e *o que a autora controla*. As 12 camadas Allegory descrevem *como outro projecto fabricaria isso* (Inform 7 + ENE + Laws + Sharpee + Ananke + npcsts + TDRS + dramaturge + sogh + Curveship + Viv + EventBus).

O Lume já tem o núcleo que importa: entidades com tags/stats/links, regras ON/IF/DO, especificidade, efeitos (`EMIT` `KNOW` `INTENT` `WAIT` `TICK` `THEN`), kit de aventura, dry-run, NLP frágil, IDE.

A integração correcta **não** empilha 12 runtimes. Extrai o *ponto forte* de cada ferramenta, escreve-o em dados Lume (taxonomia, regras de kit, entidades, templates) e, quando precisa de código, cria um plugin EMPA que **regista um EffectOp ou uma capability** — nunca um matcher paralelo.

Três eixos do pedido:

| Eixo | Significado em Lume | Não é |
|------|---------------------|-------|
| **Vida** (acção ↔ reacção) | Depois do `interact` do jogador, agentes `vivo` e canais globais reagem pelo **mesmo** matcher (`INTENT` / `THEN` / `TICK`) | tick autónomo infinito, AI de NPC, segundo loop |
| **Procedural local e global** | Kit genérico (local) + entidades `channel` / `process` (global). Autor ganha por especificidade | gerador neural, ECS, Systems Allegory |
| **Narrativa humana + determinismo** | `narrativa:` com voz, função, variedade via `cycleIndex` e seed de sessão | sogh/Markov em runtime, LLM, embeddings |

O sistema só “desaparece” (tese da Parte III) se o jogador vir prosa e o autor vir ON/IF/DO — nunca 12 logs de motores estrangeiros.

---

## 1. O que o Lume já tem (não reconstruir)

Boot actual: **21 plugins**. Matcher único. DSL:

```
ON: PORTA
IF: JOGADOR.intent=open
DO: PORTA.aberta
    EMIT porta_aberta
    KNOW JOGADOR.PORTA
    INTENT GOBLIN.attack.JOGADOR
    WAIT 3.FUSE_PORTA
    TICK
    THEN CORREDOR
narrativa: "…"
```

| Peça | Plugin | Cobre da Experiência |
|------|--------|----------------------|
| Prompt, turnos, rewind | `narrative-engine` runtime | ciclo de jogo; replay da sessão |
| `intent.*` + autocomplete | `intent-engine` + CommandBar | parser pontilhado |
| `pega a tocha`, `posso …?` | `nlp` + `dry-run` | parser tolerante + dry-run salvador |
| take/drop/put/open/go | `kit-adventure` | interagir |
| talk/ask/tell/bye, `topic`, `falando` | `kit-adventure` | conversar (ConvNode = `links.conv` + `THEN`) |
| `in`/`on`/`held_by`/`exit_*` | `spatial` | ir, inventário espacial |
| scope / `can_see` / `dark` | `senses` | o que o olhar alcança |
| `INTENT` no DO | `agency` | NPC dispara comando (**sem** loop autónomo ainda) |
| `WAIT`/`TICK` | `process` | fusíveis; autor opta com `DO: TICK` |
| `THEN` + `a; b` | `chain` | cadeia sem segundo motor |
| Sidebar ENTITIES/RULES | `ide-ui` + `ide-state` | ateliê mínimo |
| Preview + Inspector query | `ide-ui` | playtest no IDE |
| Save/load project + playtest | `project-cloud` | persistência de autoria |
| Plugins externos sandbox | `ext-host` | biblioteca de terceiros (JSON, prefixo `ext-`) |

**Buracos em relação à Experiência** (o resto do plano):

1. NPCs não reagem sozinhos depois do beat do jogador.
2. Não há humor / relação / memória como *kit* (só o que o autor inventar à mão).
3. Não há canais globais (corrupção, economia) como entidade de primeira classe.
4. Combate é um leaf `attack` sem kit de dano/medo.
5. Prosa é um string por regra — sem voz, função narrativa, recap.
6. Não há sifting (“uma história emergiu”).
7. Não há Skein, mapa, index, debug de beat, play-skin, seed visível, partilha de sessão.

---

## 2. Tradução das 12 camadas (Allegory → Lume)

A ordem numérica L0–L11 **não** é a ordem de construção no Lume. Cada linha diz: ponto forte, o que **não** entra, e o dono Lume.

| L | Motor | Ponto forte a guardar | Recusar | Dono Lume |
|---|--------|----------------------|---------|-----------|
| 0 | Inform 7 + SSG | Mundo descrito em linguagem de autor; index gerado; validação ao escrever | Compilador Inform 7; fluent `ThereIsA…` | DSL actual + IDE (E8–E10) |
| 1 | Parser Inform 7 | Frase → intenção; compostos; interrogativa | Embeddings; Transformers; Inform 7 WASM | `nlp` + `intent-engine` (já S8; alargar léxico em E4/E11) |
| 2 | ENE + Allegory Laws | Um vencedor por especificidade | Leilão, `ContributionStatus`, ECS, segundo matcher | `findMatchingRule` — **não mexer** |
| 3 | Sharpee traits | Capacidades compostas (openable, portable, weapon…) | Behaviors que mutam fora das regras; 51 actions como motor | tags + kit (E2, E4) |
| 4 | Ananke | Determinismo, seed, replay, números explícitos | Física 20 Hz, SI, Three.js, ponto fixo no núcleo | stats + regras de kit combate (E4); seed de sessão (E7) |
| 5a | npcsts | Humor, memória, preferência | Motor de psicologia; estratégias Greet/Joke | stats `mood` + `KNOW` + kit social (E2) |
| 5b | TDRS | Grafo de relações (valor + categoria) | Unity/C#; faction engine | entidade `relation` ou links+stats (E2) |
| 6 | multilinear | Canais independentes (corrupção, economia) | Máquina de estados noutro runtime | entidade `tags: channel` + regras + `THEN` (E3) |
| 7 | dramaturge | Grafo de diálogo; sem beco; factos | WASM Rust; ConversationEngine | `topic` + `falando` + `links.conv` (já S7; validar em E10) |
| 8 | sogh | Função narrativa + voz + variedade | Markov runtime, 8 estágios, neural | templates `narrativa:` + extras de voz (E5) |
| 9 | Curveship | Mesma história, outro discurso (flashback, focalizador) | **GPL-3 — não vendorar**; não mutar o mundo | apresentação de `history[]` (E5 recap; E7 Skein) |
| 10 | Viv / Felt | Reconhecer sequência de eventos | DSL Viv; DataScript; LLM | query sobre `EMIT` + `history` (E6) |
| 11 | EventBus + Text | UI agnóstica; CLI e browser | segundo text-service | EventBus actual + PreviewPane + play-skin (E11) |

**Inform 7 não entra como língua.** O autor Lume continua a escrever entidades e `ON/IF/DO`. O “The Dusty Cave is a room” do doc vira:

```
CAVERNA.place
  name: A caverna empoeirada
  description: A caverna é húmida e fria.
ESPADA.in=CAVERNA
ESPADA.weapon.cursed
```

---

## 3. Matriz GitHub — o que se pode integrar

Regra: **nunca `npm install` um motor estrangeiro no núcleo.** Adaptar ideias e, se a licença for MIT/BSD/Apache, copiar **listas de dados** (verbos, traits, padrões) para ficheiros de kit. Código de runtime reescreve-se no plugin Lume.

### 3.1 Integrar por adaptação (permitido)

| Repo | Licença | Linguagem | O que extrair | Para que fase | Como |
|------|---------|-----------|---------------|---------------|------|
| [ChicagoDave/sharpee](https://github.com/ChicagoDave/sharpee) | MIT | TypeScript | 51 actions stdlib; nomes de traits; cadeia NPC (mood, goals, influence) como *modelo de dados*; message IDs; transcript tests | E2, E4, E11 | Ler `@sharpee/stdlib` e `@sharpee/character`. **Não** importar engine/parser. Traits → tags do kit. Actions em falta → leaf no catálogo **só se o kit tiver regra**. |
| [jschomay/elm-narrative-engine](https://github.com/jschomay/elm-narrative-engine) | other / uso já feito | Elm | Matcher já está no Lume. Cycling de narrativa (`cycleIndex`) já existe | — | **Não clonar.** Não portar `TIME()`. |
| [its-not-rocket-science/ananke](https://github.com/its-not-rocket-science/ananke) | MIT | TypeScript | Contrato: mesmo seed + comandos + ticks = mesmo snapshot. `ReplayRecorder` | E4 (números), E7 (seed/replay) | Ler `STABLE_API.md`. **Não** ligar o kernel 20 Hz. Combate = stats e `DO: ALVO.hp-N`. |
| [ShiJbey/TDRS](https://github.com/ShiJbey/TDRS) | MIT | C# / Unity | `Relationship { from, to, value, category, traits }` | E2 | Reimplementar como entidade `tags: relation` no WorldModel. Zero Unity. |
| [sunsided/dramaturge](https://github.com/sunsided/dramaturge) | MIT / Apache / EUPL | Rust | Checks de grafo: alvo em falta, inalcançável, beco, ciclo, facto órfão | E10 | Reimplementar em TS sobre `topic` + `links.conv`. Sem WASM. |
| [sogh/narrative-engine](https://github.com/sogh/narrative-engine) | MIT | Rust | Função narrativa (`confrontation`, `transaction`, `discovery`); voice profile; variedade | E5 | Templates no `narrativa:` e `extra.voice`. Sem Markov, sem crate. |
| [mkremins/gossamer](https://github.com/mkremins/gossamer) (`microfelt.js`) | (verificar no clone) | JS | Padrão de sequência de eventos (e1 → e2 → e3) | E6 | Reimplementar com Query + `history` / entidades `event`. Sem DataScript. |
| [siftystudio/viv](https://github.com/siftystudio/viv) | licença própria | JS + Python | *Ideia* de sifting; tropes | E6 | **Não embeber o DSL.** Só a noção de padrão nomeado sobre o cronículo. |
| [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | MIT | TypeScript | Formato de nós/opções | E10 opcional | **Importer** (ext-plugin): ink → entidades `topic` + regras. Não runtime Ink no matcher. |
| [YarnSpinnerTool/YarnSpinner](https://github.com/YarnSpinnerTool/YarnSpinner) | (Apache/MIT — confirmar) | C# | Sintaxe de diálogo amigável | E10 | Só referência de UX do editor. Sem runtime C#. |
| [JasonLautzenheiser/trizbort](https://github.com/JasonLautzenheiser/trizbort) | (verificar) | C# | Mapa de salas + saídas | E8 | SVG/canvas a partir de `exit_*` e `in`. Sem WinForms. |
| [jschomay/ene-graph](https://github.com/jschomay/ene-graph) | — | JS | Visualizar regras/entidades | E8 | Ideia de grafo no canto do IDE. |

### 3.2 Ler, não integrar

| Repo | Porquê não | O que ficar só como inspiração |
|------|------------|--------------------------------|
| [allegoryjs/allegoryjs](https://github.com/allegoryjs/allegoryjs) | Pré-alpha; ECS; embeddings; leilão de Laws. Choca invariantes 1, 10, 13, 14, 15 | A *experiência* já está traduzida neste plano |
| Inform 7 (I7 compiler) | Binário nativo enorme; outra língua | Index, Skein, skein-to-source — UX, não compilador |
| TADS 3 | C++; ConvNode já traduzido em S7 | Convenções de tópico |
| Curveship-js [nickmontfort/curveship-js](https://github.com/nickmontfort/curveship-js) | **GPL-3** infectaria o Lume | Reimplementar *spin* de apresentação **do zero** (E5/E7) |
| npcsts | **Não existe repo público** encontrado | Modelo: `mood` + memória=`KNOW` + preferências em `extra` |
| “multilinear” | **Não existe repo** com esse papel | Canais = entidades (E3) |
| Sonder_Engine, QuietStories, ananke-language-forge | LLM em runtime | Proibido (determinismo + “IA não gera narrativa”) |
| inkle/ink runtime no núcleo | Segundo motor de conversa | Só importer opcional via `ext-host` |

### 3.3 Como clonar quando a fase pedir

Na fase En correspondente:

1. `git clone --depth 1` do repo para `/tmp` ou pasta fora de `src/`.
2. Ler README + o módulo de dados (stdlib, traits, relationship).
3. Copiar **listas** (nomes de acções, categorias de relação) para `src/plugins/kit-*/data/`.
4. Apagar o clone. **Não** commitar o motor estrangeiro.
5. Testes Lume cobrem o comportamento traduzido.

Licenças MIT/BSD/Apache: mencionar origem num comentário de uma linha no ficheiro de dados. GPL: não copiar código.

---

## 4. Invariantes que este plano não toca

Ver [INVARIANTES.md](INVARIANTES.md). Em particular, **todas** as fases En:

1. Um só `findMatchingRule`. Sem auction, sem Systems, sem ConversationEngine.
2. Semântica (`classify`) não altera o vencedor.
3. Rewind = `initialWorld` + replay de `triggerId`. Estado novo vive no WorldModel.
4. Perceive/cognize não chamam `interact` e não mutam.
5. Dry-run não corre EMIT/KNOW/INTENT/WAIT/TICK/THEN **nem** o ciclo de vida (E1).
6. NLP não entra no match. Falha fechado. Sem embeddings.
7. Sem `TIME()`, sem `MODIFY()`, sem `INTENT(open_door)` Elm.
8. Plugin novo não importa outro plugin (capability + evento).
9. Não criar FearEngine / ConstraintEngine / LifecycleEngine / PhysicsEngine.
10. Não primitivas FEAR/FLEE — catálogo + regras compostas.
11. Caverna e planetário compilam e jogam iguais se a fase não migrar exemplos.
12. Plugin novo: +1 em `platform-bootstrap.test.ts`.
13. UI nova só em `ide-ui/lib/components/`.
14. Extensão de terceiros (Ink, mapas extra) vai para `ext-host`, não para `src/plugins/` de núcleo.

**Mudança de política autorizada por este pedido:** `agency` e `process` dizem hoje “não tick autónomo de NPC”. A **Fase E1** é o pedido explícito para reacção opt-in. Continua **sem** relógio e **sem** loop infinito: um passo de vida por beat do jogador, tecto, ordem determinística.

---

## 5. Arquitectura alvo (ainda um matcher)

```
frase / intent.* / botão
    → nlp? (só se não for pontilhado)
    → executeIntent
        → anota JOGADOR.intent*
        → interact(trigger)           # matcher 1
        → RuleEffects (EMIT/KNOW/INTENT/WAIT/TICK/THEN)
        → [E1] ciclo de vida opt-in   # ainda interact/INTENT, mesmo matcher
        → [E3] canais: THEN no canal se o evento o pedir
        → [E5] prosa: escolher variante da narrativa já produzida
        → [E6] sifting: query sobre history, sem mutar
    → beat para a UI
```

Tudo o que for “vida”, “canal”, “combate”, “diálogo” é **regra + dado**. O plugin novo, quando existir, só:

- regista EffectOp, **ou**
- expõe capability de query/apresentação, **ou**
- aplica um kit (`applyXKit`) como o adventure.

Não há `LayerMessage<T>` entre 12 motores. O EventBus Lume (`lume:game-beat`, `lume:world-event`, …) já basta. Eventos novos só se um plugin precisar de facto (ex. `lume:story-sifted`).

---

## 6. Vida — acção e reacção, local e global, procedural

### 6.1 Local (entidade à vista)

Um agente com tag `vivo` pode reagir **depois** do beat do jogador, no mesmo turno de parede, como cadeia `INTENT`/`THEN`:

```
ON: GOBLIN
IF: GOBLIN.vivo
    GOBLIN.mood<2
    JOGADOR.current_location=GOBLIN.current_location
DO: INTENT GOBLIN.flee.CAVERNA
narrativa: "O goblin recua, ferido."
```

O autor escreve a reacção. O kit (E2/E4) traz **fallbacks** genéricos (`ON: *.agent` com peso baixo). O específico ganha.

**Motor de vida (E1), não de IA:**

- Opt-in: tag `vivo` **ou** o autor põe `DO: LIVE` no fim de uma regra (EffectOp novo, como `TICK`).
- Quem: agentes `vivo` no scope (`Senses.scope`) **ou** o id do `LIVE`.
- O quê: `interact(id)` no agente — o matcher escolhe a regra de reacção (IF lê o mundo já mutado pelo jogador).
- Ordem: ids ordenados (determinismo).
- Tecto: `MAX_LIVE_PER_BEAT` (ex. 4), reusa `MAX_EFFECT_DEPTH`.
- Dry-run: lista `LIVE` / candidatos, **não** executa.
- Sem `vivo` no mundo = zero mudança de play (caverna intacta).

Isto é a tradução de “o goblin olha com medo” e de npcsts — **sem** npcsts.

### 6.2 Global (o mundo reage)

Canais (E3) são entidades, não um runtime:

```
CORRUPCAO.channel
  state: clean          # stat ou tag
ON: CORRUPCAO
IF: CORRUPCAO.intent=advance
    CORRUPCAO.state=clean
DO: CORRUPCAO.corrupted
    CORRUPCAO.state=corrupted
    THEN CIDADE
narrativa: "A guarda da porta já não serve o mesmo senhor."
```

Uma regra local faz `THEN CORRUPCAO` ou `EMIT suborno` + regra `ON: SUBORNO DO: THEN CORRUPCAO`. Independência: um canal **não** escreve noutro; o autor encadeia com `THEN` se quiser acoplar.

Processos já existem (`WAIT`/`TICK`). Vida global lenta = fusível:

```
DO: WAIT 5.FOME_CIDADE
ON: FOME_CIDADE
DO: CIDADE.hungry
    INTENT GUARDA.demand.JOGADOR
```

O autor opta `DO: TICK` nas regras de turno (já S5) — E1 **não** auto-TICK o relógio, só o `LIVE` de agentes.

### 6.3 Procedural

| Nível | O que é genérico (kit) | O que o autor pisa |
|-------|------------------------|--------------------|
| Objecto | openable/portable/weapon | `ON: ESPADA_MALDITA` |
| Agente | talk/ask/tell, mood, flee se `mood<2` | `ON: GOBLIN` |
| Lugar | look, go, dark | `ON: CAVERNA` |
| Canal | transições nomeadas | `ON: CORRUPCAO` |
| História | padrão de sifting “suborno aceite” | nome + prosa da descoberta |

Procedural **não** é gerar salas com LLM. É: o kit cobre o verbo que o autor esqueceu; o autor escreve o que importa; a especificidade decide.

Seed (E7): `createGame(..., { seed })`. Qualquer aleatoriedade futura (variante de prosa, empate) usa PRNG dessa seed. Hoje **não há** RNG no matcher — manter assim até E5 (variantes são lista, não random: `cycleIndex % n`).

---

## 7. Narrativa humana determinística

O jogador da Experiência não lê “Law cursed-take-law weight 120”. Lê *«Sua mão recua…»*.

Hoje: um campo `narrativa:` interpolado (`{ESPADA.name}`, `cycleIndex`).

E5 acrescenta **apresentação**, não um gerador:

1. **Função** (sogh, sem sogh): tag no evento ou na regra `SEMANTIC:` já existe — usar `confrontation` / `transaction` / `discovery` / `curse` como etiqueta de autor, não como classificador que muda o match.
2. **Voz**: `extra.voice` no agente ou num narrador (`NARRADOR.voice=somber`). A regra pode ter **várias** linhas `narrativa:` indexadas por voz; se não houver, a linha única actual.
3. **Variedade**: o motor já passa `cycleIndex` — o autor escreve parágrafos separados por `|` (já padrão ENE). Não Markov.
4. **Tom**: derivado de stats (`mood`, `hp`) só se o autor pôs variantes; o núcleo não “comenta a morte” sozinho.
5. **Recap / flashback**: função de **apresentação** sobre `history[]` (não muta). Traduz Curveship sem GPL: “mostrar os últimos N beats do ponto de vista de X”.
6. **Fallback humano** (verbo desconhecido): kit já narra tentativa. E11 reforça uma regra genérica `ON: *` de peso mínimo: *«Nada acontece.»* contextual (`{trigger}`), nunca “comando inválido”.

IA: continua **só** no input (S8). Nunca a gerar a prosa do beat.

---

## 8. Autor controla — o ateliê

Mapeamento directo da Parte II da Experiência:

| Painel do doc | Lume hoje | Fase |
|---------------|-----------|------|
| Mundo | SourceEditor + árvore ENTITIES | E8 mapa |
| Regras | árvore RULES | — já |
| Capacidades | tags à mão | E2/E4 kits (aplicar traits = aplicar tags+regras de kit) |
| Diálogo | `topic` + regras | E10 validador; editor visual **depois** se pedido |
| Play | PreviewPane + CommandBar | E11 play-skin |
| Skein | `history[]` existe, UI não | E7 |
| Index | Inspector query | E10 documento gerado |
| Debug L1–L11 | `lastRule` / `lastCandidates` | E9 um painel de **beat**, não 12 camadas |
| Record/Replay | rewind por triggerId | E7 seed + export JSON da sessão |
| Publish | project-cloud local | E12 export estático / link |
| Dashboard Viv | — | E6 + E12 (contagem de padrões, não analytics de 10k jogadores) |

O autor **não** vê tradução para Elm nem para Laws. Vê a regra Lume que escreveu, o vencedor, os candidatos, o diff (dry-run já faz `worldDiff`).

Skein (E7): árvore de `history` com ramos quando o autor **rewinda** e joga outra linha. Persistida no project-cloud (eventos `playtest-*` já existem).

---

## 9. Jogador sente — a superfície

A Experiência começa num link, ecrã escuro, `>`, sem IDE.

| Momento do doc | Como o Lume chega lá |
|----------------|----------------------|
| Chegada em 3 s | E11: rota/vista `play` sem sidebar; fonte serif; barra Turn · Score |
| `OLHAR` / `EXAMINAR` | já: NLP + look/inspect |
| `PEGA A ESPADA` | já S8 |
| `posso pegar?` | já dry-run; E11 mostra o aviso *«Pergunta hipotética»* |
| Combate com medo | E4 kit + E1 `vivo` + E2 `mood` |
| Falar / subornar | S7 + E2 relação + E3 canal |
| “Uma história emergiu” | E6 banner no play-skin |
| Morte com recap | E5 recap de `history` |
| Verbo absurdo | kit fallback + E11 |
| Nova sessão + seed | E7 |
| Partilhar sessão | E12 JSON + replay |

Score: stat no `JOGADOR` ou entidade `JOGO.score` — o kit não inventa sistema de pontos; o autor opta.

---

## 10. Fases E1–E12

Cada fase: objectivo, ficheiros, GitHub, testes, **não fazer**. Uma fase = um pedido.

### E1 — Vida local (reacção no beat)

**Objectivo.** EffectOp `LIVE` (e/ou scan de `tags: vivo` no scope) corre **depois** dos efeitos da regra do jogador, ainda dentro do mesmo `interactWith` / beat. Chama `interact(id)` nos agentes, ordem de id, tecto 4. Dry-run lista e não segue.

**Porquê primeiro.** Sem isto, humor/combate/canais são só dados mortos.

**Dono.** Plugin novo `lume-life` (capability `Life`) **ou** extensão de `agency` se se quiser evitar plugin — **preferir plugin novo** para não misturar “NPC dispara no DO” com “ciclo pós-beat”.

**Ficheiros.**
- `src/plugins/life/` CONTEXT, manifest, types, `lib/life.ts`, teste
- `rule-engine.ts` — `LIVE` em `EFFECT_VERBS`
- `rule-effects.ts` — `register("live", …)`
- `dry-run` — listar sem executar
- `bootstrap.ts` + conta 22
- GLOSSARIO / MAPA / ROTEAMENTO / INVARIANTES (LIVE, `vivo`)

**GitHub.** Nenhum clone. Ideia: cadeia Sharpee NPC + agency Lume.

**Idioma.**
```
DO: LIVE
DO: LIVE GOBLIN
```
Tag `vivo` no agente = candidato automático **só se** a regra do jogador tiver `LIVE` **ou** se o autor activar `settings.life: auto` no projecto (default **off** — caverna intacta).

**Testes.** Sem `vivo` = goblin-cave bit-igual. Com `vivo` + regra de reacção: um `INTENT`/`THEN` extra. Tecto. Dry-run não muta. Ordem A,B estável.

**Não.** Tick de relógio, auto-TICK, loop de todos os agentes do mundo, FearEngine, migrar exemplos, Inspector.

---

### E2 — Kit social (humor, relação, memória)

**Objectivo.** Dados, como `kit-adventure`. Sem motor.

**Conteúdo.**
- Taxonomia: `mood` (stat), `relation → information`, `memory → information`
- Entidade relação: `REL_JOGADOR_GUARDA.relation` links `from`/`to`, stat `affinity`, tags `acquaintance|friend|enemy`
- Regras genéricas de baixo peso: falar sobe `affinity` mínimo; atacar desce `mood` do alvo; `KNOW` no agente quando `EMIT` relevante
- Fallback talk já existe; acrescentar IFs que leem `mood`/`affinity` **só** como exemplos no kit, não nas regras da caverna

**GitHub.** Clonar [TDRS](https://github.com/ShiJbey/TDRS) (ler modelo) + [sharpee](https://github.com/ChicagoDave/sharpee) pacote `character`. Copiar nomes de categorias (`Enemy`, `Acquaintance`, `Friend`) para `kit-social/data/relations.ts`. Apagar clones.

**Dono.** `src/plugins/kit-social/` **ou** pasta `kit-adventure` expandida. Preferir **kit-social separado** (ENTRYPOINTS: plugin novo) para o adventure não engordar.

**Não.** npcsts, estratégias Greet/Joke, tick, primitivas FEAR, ConversationEngine.

---

### E3 — Canais globais

**Objectivo.** Entidade `tags: channel` + stat `state` + regras de transição. Kit mínimo `economia|politica|facoes` como **exemplos de dados** no kit, não activos até `applyChannelKit`.

**Idioma.**
```
ON: CORRUPCAO
IF: CORRUPCAO.intent=advance
DO: CORRUPCAO.corrupted
    THEN CIDADE
```
Avanço: `THEN CORRUPCAO` ou `INTENT CORRUPCAO.advance` a partir de uma regra local (suborno).

**Dono.** `src/plugins/kit-channel/` (dados) — **não** ChannelEngine. Query: `*.channel`.

**GitHub.** Nenhum repo real “multilinear”. Inspiração só.

**Não.** Máquinas de estado noutro runtime; um canal escrever noutro; auto-advance por relógio.

---

### E4 — Kit combate (sem física)

**Objectivo.** Traduzir Ananke/ATTACK da Experiência para stats + regras.

- Tags: `weapon`, `hostile`, `mortal`
- Stats: `hp`, `force` (inteiros; default 1)
- Regras kit: `attack` em agente `hostile` faz `ALVO.hp-ATACANTE.force` (via `DO: ALVO.hp-N` já suportado?), `mood-`; se `hp<=0` tag `dead` + `EMIT morte`
- Verificar se `applyChanges` já faz `ENTIDADE.stat-N`. Se não, **não** inventar `MODIFY` Elm — estender o parser de DO de stats no `rule-engine` (já há `JOGADOR.hp-10` no MAPA)

**GitHub.** Sharpee `ext-basic-combat` (listas) + Ananke README (determinismo). **Não** o loop 20 Hz.

**Léxico NLP.** Aliases: `atacar`, `bater`, `kill` → `intent.action.interact.attack` (ficheiro de léxico no nlp, não no matcher).

**Não.** Joules, ângulo, massa, Three.js, segundo matcher, migrar caverna para combate.

---

### E5 — Prosa determinística (voz, função, recap)

**Objectivo.** Apresentação do beat.

- `narrativa:` continua dona.
- Variantes por `cycleIndex` (já) e por `extra.voice` se o autor listar blocos.
- Recap: capability `Prose.recap(history, { focalizer, order })` que **só lê** e devolve markdown. Flashback = filtrar/reordenar beats.
- Função narrativa: campo opcional na regra (`FUNCAO: curse`) — **não** entra no score.

**GitHub.** Ler sogh README (funções, vozes). Reimplementar listas em `kit-prose/data/functions.ts`. Curveship: **não copiar código GPL**; recap é implementação original.

**Não.** Markov, 8 estágios, WASM, LLM, alterar vencedor da regra.

---

### E6 — Sifting (histórias emergentes)

**Objectivo.** Padrões nomeados sobre o cronículo.

Padrão = dados:

```
PADRAO corrupcao_guarda
  eventos: suborno, aceite, canal_corrupted
  nome: The Corruption of the Gate Guard
```

Depois de cada beat (não no matcher): se a sequência de entidades `event` / tipos em `history` casar, emit evento `lume:story-sifted` e guarda lista no GameState (replayável — a lista reconstrói-se a partir do history, **não** é store paralelo).

**GitHub.** Ler [microfelt.js](https://github.com/mkremins/gossamer) e a ideia Viv. Sem DataScript, sem `.viv`.

**UI.** Banner no play-skin (E11) e linha no Index (E10). Sem dashboard de milhares de jogadores.

**Não.** Detecção por LLM, alterar o mundo, segundo motor.

---

### E7 — Skein, seed, sessão replayável

**Objectivo.** A autora rebobina um nó e o jogador recomeça com seed.

- Seed no `createGame` (mesmo que só seja usada em E5 variantes / empates futuros).
- Export JSON: `{ seed, initialWorld, triggerIds[] }`. Import = `createGame` + replay.
- UI Skein: árvore a partir de `history` + ramos gravados no project-cloud.
- Partilha interna (ficheiro), não fórum.

**GitHub.** Ananke ReplayRecorder (ideia). Inform 7 Skein (UX).

**Ficheiros.** `ide-ui/.../Skein.tsx` + `project-cloud` playtest. `runtime.ts` aceita seed.

**Não.** Debugger de 12 camadas. Relógio de parede.

---

### E8 — Mapa espacial (autor)

**Objectivo.** Grafo salas + saídas a partir de `spatial` (`exit_n`…, `in`). Clique abre a entidade.

**GitHub.** Trizbort / ene-graph como referência visual. Implementação SVG própria.

**Não.** Editor Inform; gerar mundo.

---

### E9 — Debug de beat (um painel, não 12 motores)

**Objectivo.** No IDE, cada comando mostra:

```
intent.action.interact.take.ESPADA
regra: r_espada_maldita
candidatos: [r_espada_maldita (spec 4), r_take_gen (spec 1)]
efeitos: KNOW, LIVE
vivo: GOBLIN → r_goblin_medo
```

Usa `lastRule`, `lastCandidates`, lista dry-run de efeitos. Traduz o “Debug L1–L11” sem mentir 12 camadas.

**Não.** Logs por motor estrangeiro. Inspector novo de física.

---

### E10 — Index + validação de diálogo/mundo

**Objectivo.** Documento gerado: salas, objectos, agentes, regras, traits (tags), canais, padrões de sifting. Validador: `topic` sem regra `ask`; `links.conv` para id inexistente; canal sem 2 estados; `vivo` sem regra de reacção (warning).

**GitHub.** dramaturge-authoring checks.

**Não.** Compilador Inform. Gerar regras automaticamente.

---

### E11 — Superfície jogador (play-skin)

**Objectivo.** Vista sem IDE: título, turn, score opcional, prosa, `>`, aviso de dry-run, banner E6, fallback humano.

- Reusa CommandBar + PreviewPane em layout play.
- NLP já ligado.
- Mensagem dry-run visível: *«Pergunta hipotética: nenhuma acção foi executada.»*
- Léxico NLP alargado com lista Sharpee (PT/EN) — ainda falha fechado.

**GitHub.** Sharpee `platform-browser` / `lang-en-us` (message IDs → ideias de copy). Não o client inteiro.

**Não.** Download nativo. Embeddings. Migrar caverna.

---

### E12 — Publicar e partilhar sessão

**Objectivo.** Export estático do play-skin + bundle do projecto (já há persistência). Export da sessão E7 como link/ficheiro JSON para replay.

**Não.** Store na nuvem de 10k jogadores, fórum, biblioteca global de traits (isso é `ext-host` + kit download **já existente**). Analytics Viv.

A “biblioteca compartilhada” da Experiência = kits no repo (`kit-adventure`, `kit-social`, `kit-channel`, `kit-combat`) + plugins `ext-*`. Não um marketplace nesta fase.

---

## 11. Ordem, dependências, paralelismo

```
S1–S8  (feito)
   │
   ▼
  E1 Vida local
   │
   ├──────────────┬──────────────┐
   ▼              ▼              ▼
  E2 Social     E3 Canais      E4 Combate     (kits, paralelos após E1)
   │              │              │
   └──────┬───────┴──────┬───────┘
          ▼              ▼
         E5 Prosa       E6 Sifting     (leitura do mundo; paralelos)
          │              │
          └──────┬───────┘
                 ▼
                E7 Skein/seed          (precisa history estável + vida)
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
       E8 Mapa  E9 Beat  E10 Index     (IDE, paralelos)
        │        │        │
        └────────┼────────┘
                 ▼
                E11 Play-skin
                 │
                 ▼
                E12 Publicar
```

**Critério de avançar:** testes da fase verdes, `tsc --noEmit` 0, caverna/planetário iguais, conta de plugins actualizada, CONTEXT do plugin escrito.

Duração: irrelevante em semanas-empresa. Cada En é um slice vertical testável, no mesmo espírito de S1–S8.

---

## 12. Critérios de aceitação globais (quando E12 fechar)

Jogador:

- [ ] Entra no play-skin, vê prosa, prompt `>`
- [ ] `olhar`, `pega a espada`, `posso atacar?` (dry-run sem mutar)
- [ ] NPC `vivo` reage uma vez por beat, determinístico
- [ ] Relação/humor mudam por regras de kit, autor pode pisar
- [ ] Canal global só muda quando uma regra o puxa (`THEN` / `INTENT`)
- [ ] Banner de padrão de sifting se o autor definiu o padrão e a sequência ocorreu
- [ ] Replay com a mesma seed+comandos = mesmo `history` e mesma prosa
- [ ] Caverna e planetário **sem** os kits aplicados jogam como hoje

Autor:

- [ ] Continua a escrever ON/IF/DO (não Inform 7, não Laws)
- [ ] Aplica kits opt-in (`applySocialKit`, etc.)
- [ ] Vê Skein, mapa, index, debug de beat
- [ ] Controla vida: sem `vivo`/`LIVE` nada reage
- [ ] Controla prosa: a linha que escreveu é a que sai (variantes só se ele as escreveu)
- [ ] Exporta projecto e sessão

Motor:

- [ ] Um `findMatchingRule`
- [ ] Nenhum `import` de `@sharpee/*`, `allegoryjs`, `inkjs` no núcleo
- [ ] Nenhum GPL no tree
- [ ] Efeitos novos via `RuleEffects`
- [ ] Rewind intacto

---

## 13. Anti-padrões — recusar mesmo se o pedido futuro os repetir

| Pedido | Resposta Lume |
|--------|----------------|
| “Integra o Allegory.js / ECS / leilão” | Não. Especificidade já decide. |
| “Embeddings / Transformers / OpenAI na prosa” | Não. NLP só frase→intent. |
| “Porta o Ananke 20 Hz” | Não. Stats + regras. |
| “ConversationEngine / Ink runtime no match” | Não. topic + falando + THEN. Importer só em ext-host. |
| “TIME(after 10 seconds)” | WAIT/TICK. |
| “FearEngine / PhysicsEngine / LifecycleEngine” | Kit + LIVE. |
| “Migrar a caverna para o kit combate” | Só se o pedido da fase o disser. Default: não. |
| “12 logs L1–L11” | Um beat: intent, regra, candidatos, efeitos. |
| “Copiar curveship-js” | GPL-3. Recap original. |
| “Tick todos os NPCs do mundo” | Scope + tecto + opt-in. |

---

## 14. Como executar uma fase

Pedido canónico:

> faça agora **Fase En — <título>** de forma completa, sem mais e sem menos.

A IA dessa chamada:

1. Lê este plano (secção En) + CONTEXT dos plugins donos + INVARIANTES.
2. Não lê as 12 camadas de novo.
3. Não começa En+1.
4. Não aplica kits aos exemplos.
5. Testes da fase + caverna + `tsc`.
6. Actualiza MAPA / ROTEAMENTO / GLOSSARIO / conta de plugins se houver plugin novo.

---

## 15. Glossário rápido deste plano

| Neste plano | Em Lume |
|-------------|---------|
| Vida | `LIVE` + tag `vivo` + mesmo `interact` |
| Trait Sharpee | tag (+ regra de kit) |
| Relationship TDRS | entidade `relation` ou links+stats |
| Canal | entidade `channel` + `THEN` |
| Law / System | **não existe** — Rule ON/IF/DO |
| Spin Curveship | recap de `history[]` |
| Sifting Viv/Felt | padrão sobre eventos + history |
| Skein | UI da `history` + ramos |
| Seed | campo de sessão; replay = replay de triggerIds |

---

**Fim do plano.** Implementação só quando vier `faça agora Fase En`.
