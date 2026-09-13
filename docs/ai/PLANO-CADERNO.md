# Plano Lume — Caderno vivo (autor em linguagem humana)

> Depois de **E1–E12 (feito)**. Traduz o pedido *«digitar cadernos de regras em linguagem humana»* (ficheiro DeepSeek, 13/09/2026) e **reconsidera** as recusas do [PLANO-EXPERIENCIA.md](PLANO-EXPERIENCIA.md) §2–§3.2.
> **Ainda um só `findMatchingRule`.** O caderno **não** é um segundo motor: é um **compilador** (frase humana → fontes Lume). Rewind = replay. Sem embeddings, sem LLM a gerar prosa, sem 12 runtimes.

**Como usar este ficheiro:** cada fase Cn é um pedido futuro *«faça agora Fase Cn, de forma completa, sem mais e sem menos»*. Este plano **não implementa**. Só descreve.

---

## 0. Tese

O autor do DeepSeek não quer ver `ON:` / `IF:` / TypeScript. Quer **páginas**. O jogador já tem play-skin (E11). O motor já reage (E1–E6). O que falta é a **língua do caderno**.

```
caderno (português estruturado)
    → compileNotebook()          # tempo de escrita, O(linhas)
    → entitiesSource + rulesSource + taxonomy + PADRAO
    → compileProject()           # já existe
    → findMatchingRule           # já existe, um só
    → beat (prosa, LIVE, canais, sift)
```

**Eficiência.** Doze motores no beat = o caminho lento. Um matcher + compile no save = o caminho rápido. O caderno custa **uma vez**, quando a autora pára de escrever. O beat continua O(regras × especificidade).

Três eixos deste pedido:

| Eixo | Significado em Lume | Não é |
|------|---------------------|-------|
| **Caderno** | Fonte humana que *compila* para o idioma Lume | JSON, formulários, Elm, I7 |
| **Reconsideração** | Capacidades recusadas entram **adaptadas** no motor Lume | `npm install` Ananke/Dramaturge/Viv/Unity |
| **Infinitude modular** | Novo caderno = mais entidades/regras; tear por identidade; módulo on/off | embeddings a “adivinhar” ligações; gerador neural de mundo |

O sistema só desaparece se a autora vir **páginas** e o jogador vir **prosa**. O `ON/IF/DO` continua a existir — **atrás** da porta, para rewind, kits e debug E9.

---

## 1. O que já está feito (não reconstruir)

E1–E12 fecharam a simulação. O caderno **usa** isto; não o substitui.

| Pedido do caderno DeepSeek | Já no Lume | Fase |
|----------------------------|------------|------|
| Mundo reage | `LIVE` / `INTENT` / `THEN` / `TICK` | E1, S5, S6 |
| Humor, relação, memória | kit-social `mood` `relation` `KNOW` | E2 |
| Canais (corrupção, economia) | `tags: channel` + `state` | E3 |
| Dano, morte, arma | kit-combat `hp` `force` `dead` | E4 |
| “narre …” | `narrativa:` + voz + `FUNCAO:` | E5 |
| História que emerge | `PADRAO` + banner | E6 |
| Voltar, ramos, seed | rewind, Skein, sessão JSON | E7 |
| Mapa de salas | `exit_*` + SVG | E8 |
| Testar sem código | dry-run + beat debug | E9 |
| Índice, becos, duplicados | `buildWorldIndex` + W010–W013 | E10 |
| Jogador sem IDE | PlaySkin `>` | E11 |
| Partilhar módulo / sessão | HTML play, `#play=`, `#sessao=`, `.lume.json` | E12 |
| Frase do jogador | nlp falha fechado | S8 / E11 |

**Buraco único em relação ao DeepSeek:** a autora ainda escreve entidades pontilhadas e `ON/IF/DO`. Quer escrever:

```
A caverna é húmida e fria.
Quando o jogador pega a espada:
  narre "Sua mão recua…"
  cause 5 de dano ao jogador.
```

---

## 2. Reconsideração — o que foi recusado, o que entra agora

Pedido: *integrar no motor, adaptado; simulação narrativa; cadernos humanos.*

Regra nova (não anula [INVARIANTES.md](INVARIANTES.md)):

> A **capacidade** entra no Lume. O **runtime estrangeiro** não entra.
> «Directamente no motor» = EffectOp, kit, query, compilador de caderno, ou validação.
> Nunca = segundo matcher, relógio 20 Hz, WASM, DataScript, Markov, embeddings, GPL.

### 2.1 Tabela de reconsideração

| Recusa antiga | Porquê tinha sido recusada | Como **entra** no motor Lume | Continua **fora** |
|---------------|----------------------------|------------------------------|-------------------|
| **ENE + Laws** (leilão, ECS, `ContributionStatus`) | Segundo critério de vitória | A *lei* já é a especificidade. O caderno escreve mais `Se`/`Quando` → mais IF → score maior. Opcional: nota de margem `peso: sala` **não** muda o matcher; só documenta. | Leilão, ECS, Systems Allegory, `TIME()` |
| **Sharpee behaviors** (mutam fora das regras) | Comportamento invisível ao rewind | Behavior = **regra de kit** + tag. `covarde` + `vivo` → regra genérica `IF: mood<2 DO: INTENT *.flee`. Caderno: «Ele é covarde.» → tag + kit. | `@sharpee/engine`, 51 actions como motor, behaviors que escrevem o mundo às escondidas |
| **Ananke física 20 Hz** | Relógio de parede; Three.js; SI; quebra replay | Física **discreta**: 1 `TICK` por beat do jogador (já S5). `force`/`hp` já existem. Extensão: `massa` `impulso` como stats; colisão = duas entidades no mesmo `in` + regra `ON: * IF: *.massa`. Seed Ananke já em E7. | loop 20 Hz, ponto fixo, Three.js, unidades SI no núcleo |
| **npcsts / TDRS / Unity / psicologia** | Motor de personalidade; C# | Psicologia = **dados + LIVE**. `mood`, `affinity`, `relation` (E2). Extensão caderno: «Ele quer o trono.» → `extra.goal=trono` + regra kit `IF: *.goal DO: INTENT *.pursue.{goal}`. TDRS já é entidade `relation`. | Unity, FSM de Greet/Joke, rede neural de traços |
| **Canais / 2º runtime** | Máquina de estados noutro processo | Já é entidade `channel` (E3). Caderno «O canal corrupção tem três estados» → `CORRUPCAO.channel` + regras de transição. Independência = um canal não escreve noutro salvo `THEN`. | runtime FSM paralelo |
| **dramaturge / WASM** | crate Rust no beat | Já é `validateWorld` (E10). Extensão caderno: «Veja também: Seção 4» → link de índice + W014 se o alvo faltar. Grafo de diálogo = `topic` + `links.conv`. | WASM, ConversationEngine |
| **sogh / Markov / neural** | gerador no beat | Já é `FUNCAO:` + voz + `a\|b` + `cycleIndex` (E5). Caderno «narre "…"» → `narrativa:`. Variedade = várias linhas `narre`, não Markov. | Markov runtime, 8 estágios sogh, LLM |
| **Viv / Felt — DSL Viv, DataScript** | segundo query engine | Já é `PADRAO` sobre `history` (E6). Caderno «Padrão: jogador pega a espada → marcado maldito» → `PADRAO` + eventos. Significância = `extra.weight` **só no banner**, não no match. | DSL Viv, DataScript, LLM de tropes |
| **Output / 2º text-service** | dois narradores | PlaySkin (E11) é o texto do jogador. Caderno é o texto da autora. Um EventBus. Recap (E5) é apresentação do **mesmo** `history`. | segundo serviço de prosa, gerador paralelo |

### 2.2 O que isto **não** autoriza

- `npm install` ananke / sharpee / dramaturge / viv / inkjs no núcleo.
- Tick autónomo infinito («a cada turno» no caderno = `LIVE` ou `WAIT 1.FUSE` **opt-in**, tecto já existente).
- Embeddings para «tecer» secções — o tear é **identidade** (ver §5).
- IA a **escrever** o mundo. IA, se existir, só **traduz** caderno→DSL com falha fechada, ou descreve um dry-run. Nunca gera a prosa do beat.

---

## 3. Arquitectura alvo

```
┌─────────────────────────────────────────┐
│  Vista Caderno (páginas, não IDE)       │  C9
│  capa · índice · secções · margens      │
└─────────────────┬───────────────────────┘
                  │ notebooksSource
                  ▼
         compileNotebook()                 C1–C7
           · léxico de mundo
           · quando/se/narre/cause
           · tear (aliases)
           · módulos on/off
                  │
                  ▼
     Project { entities, rules, taxonomy, patterns }
                  │
                  ▼
            compileProject()               já existe
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   findMatchingRule     validateWorld      E10 + C8
        ▼
   LIVE / THEN / TICK / PADRAO / prosa
```

Plugin dono do compilador: **`lume-notebook`** (plugin novo, entrypoint 1). Não importa outros plugins. Expõe capability `Notebook`. O IDE chama `Notebook.compile(text) → { entitiesSource, rulesSource, extras, patterns, issues }`. `narrative-engine` **não** muda o matcher.

A vista Caderno é entrypoint 4 em `ide-ui` (`NotebookPane`). O SourceEditor de `ON/IF/DO` **não desaparece** — fica atrás de «Mostrar motor» (opt-in). Default da autora = páginas.

---

## 4. Língua do caderno (gramática mínima, falha fechada)

Não é português livre. É **português estruturado**: frases que o compilador reconhece, como o NLP do jogador reconhece verbos. Frase desconhecida = aviso humano, **não** entidade fantasma.

### 4.1 Capa e secções

```
CADERNO: A Caverna Amaldiçoada
Autora: Maria
Data: 13 de setembro de 2026
Dedicatória: Para quem ousa descer.

## 1. As Salas
### 1.1 A Caverna
…
```

- `CADERNO:` → `project.meta.name`
- `## N. Título` → secção (módulo)
- `### N.M Nome` → entidade ou regra nomeada
- Linha começada por `#` de motor Lume **não** aparece no caderno

### 4.2 Mundo (entidades)

| Frase humana | Compila para |
|--------------|--------------|
| `A caverna é húmida e fria.` (primeira linha sob `### A Caverna`) | `CAVERNA.place` + `description` |
| `A caverna leva ao norte para a floresta.` | `CAVERNA.exit_north=FLORESTA` + inverso se a outra sala existir |
| `A espada enferrujada está na caverna.` | `ESPADA.in=CAVERNA` (ou `current_location`) |
| `Ela é uma arma.` / `Ela é amaldiçoada.` | tags `weapon` `cursed` |
| `Ele é hostil.` / `Ele é covarde.` | tags `hostile` `covarde` (+ kit combate/social se presentes) |
| `O goblin está na caverna.` | `GOBLIN` `agent` `vivo` `in=CAVERNA` |
| `Ela drena 1 de vida por turno.` | stat + regra `WAIT`/`LIVE` (ver 4.3) |
| `Veja também: Seção 4 — As Maldições.` | alias / índice; W014 se a secção não existir |

Ids: slug maiúsculo da cabeça nominal (`A Espada Enferrujada` → `ESPADA_ENFERRUJADA`). Alias: «a espada», «a maldição da espada» → o mesmo id **dentro do caderno**, tabela de nomes.

### 4.3 Reacções (regras)

```
Quando o jogador pega a espada:
  narre "Sua mão recua como se uma onda de pavor a tivesse atingido."
  cause 5 de dano ao jogador.
  marque o jogador como "maldito".
```

| Frase | Compila para |
|-------|----------------|
| `Quando o jogador VERBO X:` | `ON: X` `IF: JOGADOR.intent=<verb>` |
| `Quando X é marcado como "T":` | `ON: X` `IF: X.T` **ou** `ON: JOGADOR` `IF: JOGADOR.maldito` conforme o sujeito |
| `Se o jogador está com menos de 10 de vida:` | `IF: JOGADOR.hp<10` |
| `narre "…"` | `narrativa: "…"` |
| `cause N de dano a Y` | `DO: Y.hp-N` |
| `marque Y como "T"` | `DO: Y.T` |
| `a cada turno:` (indentado sob um Quando/Se) | `DO: WAIT 1.<FUSE>` + regra no fusível **ou** `LIVE` se o sujeito for `vivo` |
| `os NPCs ao redor ficam preocupados` | `DO: LIVE` + regra kit `IF: mood` no mesmo sítio — **não** um tick de todos os NPCs do mundo |

Verbos `Quando` mapeiam pelo **mesmo** léxico NLP (pegar/take, abrir, falar…). Verbo desconhecido = aviso, regra não emitida.

### 4.4 Canais e padrões

```
O canal "corrupção" tem três estados:
  - limpo
  - corrompido
  - exposto
Transições:
  limpo → corrompido (suborno aceito)
```

→ `CORRUPCAO.channel` `state=limpo` + regras `intent=advance` como E3.

```
Padrão:
  - jogador oferece suborno ao guarda
  - guarda aceita o suborno
Significância: 0.85
```

→ `PADRAO corrupcao_guarda` `eventos: …` `nome: A Corrupção do Guarda`. `0.85` fica em `extra` do padrão para o banner, **não** no score do matcher.

### 4.5 Falha fechada

- Frase que não casa com nenhuma forma → `W020` *«Não percebi esta linha.»* + linha. Mundo intacto.
- Nome ambíguo («a maldição» com duas maldições) → `E020`, não adivinha.
- Sem embeddings. Sem «o sistema percebe o sentido». Sem LLM no compile.

---

## 5. Tear — «o sistema conecta»

O DeepSeek pede ligação automática entre secções. **Não** é um grafo semântico.

1. Cada `###` declara um **nome canónico**.
2. Tabela `aliases`: artigos + núcleo (`a espada` → `ESPADA_ENFERRUJADA`).
3. «a maldição da espada» na secção 4 = o mesmo id se o núcleo coincidir; senão a autora escreve `também chamada: maldição da espada`.
4. `Veja também:` só gera aviso se o alvo faltar (W014).
5. Kits: se o caderno diz «é uma arma» e `applyCombatKit` está no projecto, as regras genéricas de ataque aplicam-se **já**. Isso é a infinitude barata: o kit cobre o verbo que a autora não escreveu; a regra específica do caderno ganha por especificidade.

Ramificar `## 5.1 O Filho Mais Velho` = nova entidade + tags `facao` + `relation` ao pai. Três finais possíveis = três regras `ON:` com IF distintos — a autora escreve os `Quando`. O motor não inventa finais.

---

## 6. Modularidade e infinitude

| Sensação DeepSeek | Mecânica Lume |
|-------------------|---------------|
| Activar / desactivar secção | `secção.activa` (default sim). Compile **omite** entidades/regras da secção inactiva. Replay usa o snapshot E7 — desactivar a meio do play **não** muta o vivo; pede recomeçar ou avisa. |
| Mover de caderno | recorte de texto; ids estáveis |
| Reutilizar noutro mundo | export `.lume.caderno.md` + import concatena `notebooksSource` (C11, reusa E12) |
| Versionar como capítulo | um ficheiro por caderno dentro de `notebooksSource` separado por `CADERNO:` |
| Novo caderno «Magia» | novas entidades `mago` `feitico`; kit-prose/combat não mudam; o matcher vê mais regras |
| Não pensar em *como* liga | tear §5 + kits. Se não ligar, W020/W014 em prosa no assistente |

Não há crescimento «infinito» no beat: há **mais dados**. O tecto `MAX_EFFECT_DEPTH` e `MAX_LIVE_PER_BEAT` mantém-se. Um caderno de 10k linhas que gera 10k regras ainda é um matcher — compile avisa W021 *«muitas regras; o play pode ficar lento»* acima de um limiar (ex. 500).

---

## 7. Assistente de caderno (sem código)

Capability `Notebook.assist(text, world) → { notes: string[] }` — **prosa**.

| Função DeepSeek | Origem Lume | O que a autora vê |
|-----------------|-------------|-------------------|
| Validar sintaxe | issues do compileNotebook | *«Não percebi a linha 12.»* |
| Sugerir ligações | aliases + índice E10 | *«‘A maldição’ já existe na Seção 4.»* |
| Conflitos | duas regras mesmo ON+IF | *«Duas reacções para pegar a espada; a mais específica ganha.»* |
| Onde no índice | headings | *«Adicionei ‘O Clima’ ao índice.»* |
| Duplicados | mesmo slug | *«Já há uma Caverna.»* |
| Simular efeito | dry-run (S4) + recap | *«Se o jogador pegar a espada: dano 5, tag maldito. Nenhuma acção foi executada.»* |
| Consequências | LIVE candidatos E9 | *«O goblin no mesmo sítio reagiria (covarde).»* |
| Lacunas | W010–W013 + W014 | *«O goblin é vivo e não tem reacção.»* |
| Export / link | E12 | módulo `.lume.caderno.md` + `#play=` |

**Não.** Mostrar JSON, `ON:`, stack traces, «matcher», «ECS». O painel motor (SourceEditor) é um interruptor para quem o quiser.

IA externa (o prompt DeepSeek) pode **ler** o caderno e **propor texto de caderno**. Não escreve no WorldModel. Se no futuro houver um mapper LLM, entra como `registerPhraseMapper` do **caderno**, falha fechado, **depois** de C3 estável — não nesta vaga.

---

## 8. Eficiência (motor)

1. **Beat:** inalterado. `findMatchingRule` + efeitos. Caderno não corre no interact.
2. **Compile:** incremental por secção (hash da secção → cache de entidades/regras geradas). Mudar uma frase só recompila essa `###`.
3. **Tear:** mapa `nome → id`, O(nomes), no compile.
4. **Kits:** já aplicados uma vez no boot do projecto.
5. **Índice / validação:** E10 no compile, não no beat.
6. **Proibido por desempenho e por invariante:** 20 Hz, DataScript a cada comando, WASM dramaturge, segundo text-service, embeddings.

O autor sente o mundo «pesado e vivo» porque **LIVE + canais + PADRAO** já encadeiam. Não porque há física contínua.

---

## 9. Fases Cn

Pedido futuro: *«faça agora Fase Cn, de forma completa, sem mais e sem menos»*.

### C1 — Fonte caderno + compile vazio

**Objectivo.** `project.notebooksSource`. Plugin `lume-notebook`. `compileNotebook("")` → fontes vazias sem erro. Projecto sem caderno = comportamento actual (caverna intacta). Capability `Notebook`. +1 no boot.

**Não.** Parser de frases. Não esconder o SourceEditor ainda.

### C2 — Léxico de mundo

**Objectivo.** Frases §4.2 → entidades/tags/links/`exit_*`. Aliases locais à secção. Testes: «A caverna leva ao norte para a floresta» cria o par de saídas. Falha fechada em linha lixo.

**Não.** Regras `Quando`. Embeddings. Migrar caverna.

### C3 — Quando / Se / narre / cause / marque

**Objectivo.** Frases §4.3 → regras ON/IF/DO/`narrativa:`. Verbos = léxico NLP existente. `cause N de dano` → `hp-N`. Teste: pegar a espada no caderno joga igual a uma regra escrita à mão com o mesmo efeito.

**Não.** `a cada turno` ainda (C6). LLM.

### C4 — Tear e «Veja também»

**Objectivo.** Tabela de aliases entre secções. `Veja também` → W014. Homónimos → E020. Teste: duas secções «espada» / «maldição da espada» no mesmo id.

**Não.** Ligar por semelhança de texto.

### C5 — Módulos on/off

**Objectivo.** Cabeçalho de secção `activa: não` omite do compile. Mover bloco não muda ids. Teste: desactivar «Maldições» faz a espada perder a regra de dano; rewind/replay E7 continua a funcionar no snapshot antigo.

**Não.** Hot-swap no vivo.

### C6 — Cadeia reactiva e «a cada turno»

**Objectivo.** Indentação sob `Quando`/`Se` vira `THEN` / `LIVE` / `WAIT 1.FUSE` conforme o sujeito (`vivo` → LIVE, canal → THEN, senão WAIT). Tecto já existente. Dry-run lista, não executa. Teste: goblin covarde no mesmo sítio reage; caverna sem `vivo` igual.

**Não.** Tick de todos os NPCs. Relógio.

### C7 — Canais e Padrão no caderno

**Objectivo.** Secção «Canais» / «Histórias» → kit-channel + `PADRAO`. Significância só no banner.

**Não.** DSL Viv. DataScript.

### C8 — Assistente em prosa

**Objectivo.** Painel de notas sob a página: issues humanas, dry-run «o que aconteceria se…», ligações E10. Zero código.

**Não.** Chat LLM. Autocomplete de intent. no caderno.

### C9 — Vista caderno (páginas)

**Objectivo.** Superfície default do autor: capa, índice clicável, página, margem para notas (comentários `//` compilam para nada). «Mostrar motor» revela SourceEditor. Sem formulários obrigatórios.

**Não.** Substituir PlaySkin. Download nativo.

### C10 — Infinitude: vários `CADERNO:` 

**Objectivo.** Vários cadernos no mesmo projecto; índice global; W021 se regras > limiar. Novo caderno «Magia» não reescreve o anterior.

**Não.** Gerar cadernos automaticamente.

### C11 — Partilha de módulo caderno

**Objectivo.** Export `.lume.caderno.md` + import concatena. Reusa E12 para `#play=` depois de compile. Créditos na capa (`Autora:`).

**Não.** Marketplace. Loja de 10k.

### C12 — Cache incremental + «peso» documental

**Objectivo.** Hash por `###`; recompile só o sujo. Nota de margem `peso:` é comentário (não altera especificidade). Documento de eficiência no CONTEXT do plugin.

**Não.** Leilão. ContributionStatus.

---

## 10. Ordem e paralelismo

```
E1–E12 (feito)
    │
    ▼
   C1 fonte + plugin
    │
    ├──────────┐
    ▼          ▼
   C2 mundo   C9 vista (pode esboçar páginas vazias em paralelo com C2)
    │
    ▼
   C3 reacções
    │
    ├──────────┬──────────┐
    ▼          ▼          ▼
   C4 tear    C5 módulos  C7 canais/padrões
    │          │          │
    └────┬─────┴────┬─────┘
         ▼          ▼
        C6 cadeias  C8 assistente
         │
         ▼
        C10 vários cadernos
         │
         ├──────────┐
         ▼          ▼
        C11 partilha  C12 cache
```

C9 pode começar depois de C1 (páginas que gravam texto cru). Não parseia até C2/C3.

---

## 11. Nunca fazer (além de INVARIANTES)

1. Segundo matcher para o caderno.
2. Compilar caderno **dentro** de `interactWith`.
3. Embeddings / Transformers / «tecer por sentido».
4. Markov, sogh crate, Viv DSL, DataScript, WASM dramaturge, Unity TDRS, Ananke 20 Hz, Laws auction, ECS.
5. Mostrar JSON/TS à autora na vista default.
6. LLM a gerar `narrativa:` do beat.
7. Migrar goblin-cave para caderno nesta vaga (opt-in depois, pedido explícito).
8. Primitivas FEAR/FLEE — o caderno «Ele é covarde» vira tag + kit, não um verbo novo no núcleo.
9. `TIME(after 10 seconds)` — «a cada turno» é `WAIT`/`LIVE`/`TICK` opt-in.
10. Formulários no sítio das páginas.

---

## 12. Mapa DeepSeek → fase

| Trecho do caderno DeepSeek | Fase |
|----------------------------|------|
| Página em branco, capa, índice | C1, C9 |
| As Salas / Objectos / Pessoas | C2 |
| Quando … narre / cause / marque | C3 |
| Veja também; duas secções da mesma maldição | C4 |
| Activar, mover, reutilizar secção | C5 |
| Se hp<10, NPCs ao redor, a cada turno | C6 |
| Canais; Padrão / significância / arco | C7 |
| Assistente valida, simula, sugere, não mostra código | C8 |
| Magia / política / economia como cadernos novos | C10 |
| Export módulo, créditos, link | C11 |
| Motor eficiente, mundo grande | C12 + invariante 1 |

---

## 13. Critério de aceite global (quando C12 fechar)

A autora escreve o exemplo das seis secções do DeepSeek **sem uma linha de `ON:`**. O jogador pega a espada: prosa, dano, tag `maldito`, canal se descrito, banner se o padrão completar, goblin `vivo` reage se estiver no sítio. Dry-run descreve em português. Rewind rejoua. Caverna de exemplo, se não migrada, joga igual. Um só matcher. Sem 12 logs.
