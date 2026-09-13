# Eficiência de IA no Lume EMPA

Documento mestre: como fazer a IA **achar** em vez de **vasculhar**.

Cada pedido seu hoje custa dezenas de leituras porque o contexto está espalhado em código. Este arquivo descreve **todos** os mecanismos que reduzem essa busca, o que cada plugin deve declarar, o que **não** fazer, e a ordem obrigatória de leitura.

A regra única:

> A IA só abre um arquivo de implementação **depois** de saber o caminho no índice. Se o índice não tem o caminho, o índice é que está incompleto.

---

## 0. Ordem de leitura (obrigatória)

Antes de `grep` / `read_file` em massa, abrir **no máximo estes**, nesta ordem:

| # | Arquivo | Para quê | Máx. |
|---|---------|----------|------|
| 1 | [docs/ai/EFICIENCIA.md](EFICIENCIA.md) | este playbook | 1 |
| 2 | [docs/ai/MAPA.md](MAPA.md) | kernel, plugins, capabilities, eventos | 1 |
| 3 | [docs/ai/ROTEAMENTO.md](ROTEAMENTO.md) | “usuário disse X → abrir Y” | 1 |
| 4 | `src/plugins/<nome>/CONTEXT.md` | só o plugin do pedido | 1 |
| 5 | `src/plugins/<nome>/manifest.ts` + `types.ts` | contrato público | 2 |
| 6 | arquivo citado no CONTEXT na seção “abrir” | implementação | 1–3 |

Se depois do passo 4 ainda não souber o arquivo, **atualizar o CONTEXT**, não sair listando pastas.

`grep` é último recurso, e só com `path` já restrito ao plugin.

---

## 1. Todos os mecanismos (do mais barato ao mais caro)

### A. Documentos que a IA é obrigada a ler (alto impacto)

| Mecanismo | Onde | O que resolve | Custo |
|-----------|------|----------------|-------|
| **AGENTS.md aninhado** | pasta cuja árvore a IA vai editar | convenções + “não faça” no escopo | a IA já injeta isso se o arquivo existir |
| **CONTEXT.md do plugin** | `src/plugins/<nome>/CONTEXT.md` | dono, arquivos, capabilities, não-fazer, “abrir estes” | 1 read |
| **MAPA.md** | `docs/ai/MAPA.md` | grafo kernel ↔ plugins ↔ capabilities ↔ eventos | 1 read |
| **ROTEAMENTO.md** | `docs/ai/ROTEAMENTO.md` | frase do usuário → plugin/arquivo | 1 read |
| **INVARIANTES.md** | `docs/ai/INVARIANTES.md` | o que nunca mudar (match, rewind, EMPA) | 1 read |
| **SKILL.md** | `.grok/skills/<tarefa>/` | procedimento de uma tarefa repetida | 1 read |
| **ADR curto** | `docs/ai/adr/` | decisão já tomada, para não rediscutir | 1 read |

O runtime do Grok **já aplica** `AGENTS.md` / `Claude.md` / `AGENT.md` por diretório. Um `AGENTS.md` dentro de `src/plugins/intent-engine/` vale para tudo abaixo. Use isso para **proibições locais**, não para ensaios.

### B. Contratos no código (a IA lê types, não o miolo)

| Mecanismo | Convenção neste repo | Efeito |
|-----------|----------------------|--------|
| **manifest.ts** | todo plugin tem | provides / requires / eventos — o grafo |
| **types.ts** | só API pública | a IA não precisa abrir `lib/` |
| **index.ts** | reexporta público + factory | um arquivo = superfície |
| **lib/<assunto>.ts** | um assunto por arquivo | grep cai em 1 arquivo |
| **`__tests__/unit/<assunto>.test.ts`** | espelha o lib | teste = spec |
| **Capability name estável** | `IntentEngine`, `RuleEffects` | busca pelo nome da capability |
| **Event type namespaced** | `lume:world-event` | grep de 1 string |

Se a mudança é de contrato, editar `types.ts` **primeiro**. Implementação depois.

### C. Índices gerados / manuais (substituem tree-walk)

| Mecanismo | Arquivo | Conteúdo |
|-----------|---------|----------|
| Índice de capabilities | [docs/ai/MAPA.md](MAPA.md) §capabilities | `Nome → plugin → ficheiro do service` |
| Índice de eventos | idem §eventos | `lume:… → emissor → ouvintes` |
| Índice de DSL | [docs/ai/ROTEAMENTO.md](ROTEAMENTO.md) | `ON`/`DO`/`INTENT`/`EMIT` → parser |
| Índice de UI | idem | “sidebar” → `ProjectTree.tsx` |
| `bootstrap.ts` | `src/bootstrap.ts` | lista canónica de plugins e ordem |

Não duplicar o bootstrap em prosa longa. O mapa aponta; o bootstrap é a fonte da ordem.

### D. Sinalização dentro dos ficheiros (para quando abrir um grande)

| Mecanismo | Como | Evita |
|-----------|------|-------|
| **Cabeçalho de 8 linhas** | dono, capability, “não importa X”, ficheiros amigos | ler 400 linhas |
| **`@owned-by` / `@cap`** | comentário no topo `// @cap IntentEngine @file adapter.ts` | grep pontual |
| **Nomes únicos** | `executeIntent`, `findMatchingRule` — um símbolo | grep sem ruído |
| **Não usar nomes genéricos** | proibido `utils.ts` catch-all, `helpers.ts` global | 12 ficheiros “utils” |
| **Ficheiros < 300 linhas** | partir quando crescer | read_file de 800 linhas |
| **Teste com o nome do comportamento** | `it("EMIT chains ON for that id")` | spec sem ler implementação |

### E. Roteamento por intenção do utilizador

Tabela “se o pedido contém…, abrir…”. Vive em [ROTEAMENTO.md](ROTEAMENTO.md). Sem essa tabela a IA faz `list_dir src/`.

### F. Skills de procedimento (não de domínio)

Para tarefas **repetidas** (novo plugin, novo verbo DO, nova vista IDE), um SKILL com passos. A IA segue o skill em vez de explorar.

Já existe a pasta `.grok/skills/`. Skills deste repo:

- `new-plugin` — scaffold + CONTEXT + bootstrap + teste de manifest
- `new-do-verb` — EffectOp + handler + teste
- `new-ide-pane` — componente + view-registry + cópia live se houver

### G. Proibições explícitas (reduzem exploração “criativa”)

[INVARIANTES.md](INVARIANTES.md) + secção “Não fazer” de cada CONTEXT.md.

A IA explora quando **não sabe o que é ilegal**. Escrever o ilegal é mais barato do que ela descobrir no código.

### H. Código como mapa, não como romance

| Fazer | Não fazer |
|-------|-----------|
| `provides: [{ name: "Knowledge" }]` | descrever Knowledge num README de 6 páginas |
| `DO: EMIT x` parseado em `parseDoLine` | segundo parser “mais claro” |
| pastas = domínio | `common/`, `shared/`, `misc/` |

### I. Mecanismos externos (se um dia sair deste sandbox)

| Mecanismo | Uso |
|-----------|-----|
| `.cursorrules` / `.github/copilot-instructions.md` | mesmo conteúdo que AGENTS.md aninhado |
| `llms.txt` na raiz | URL/paths canónicos para LLMs |
| `CODEOWNERS` | dono humano; para IA, CONTEXT.md é melhor |
| gerador `npm run ai:index` | varrer manifests → regenerar MAPA.md |

Neste sandbox o que vale é **ficheiro no repo + AGENTS.md aninhado**. Não depender de produto externo.

---

## 2. O que cada plugin é obrigado a ter

Árvore mínima de um plugin:

```
src/plugins/<nome>/
  CONTEXT.md          ← a IA lê isto primeiro (máx. ~60 linhas)
  AGENTS.md           ← só proibições de edição neste plugin (opcional se CONTEXT cobrir)
  manifest.ts
  types.ts            ← contrato público
  index.ts            ← factory + registerCapability
  lib/                ← implementação
  __tests__/unit/
```

### Template de CONTEXT.md (copiar à letra)

```markdown
# <plugin-name>

Uma frase: o que este plugin é o único a fazer.

## Abrir
- lib/<ficheiro principal>.ts — <porquê>
- types.ts — contrato
- Nunca começar por __tests__ nem por index.ts longo

## Provides
- CapabilityNome@1.0.0 — 1 linha

## Requires
- OutraCapability (obrigatório/opcional)

## Eventos
- emite: lume:…
- ouve: lume:…

## Não fazer
- não importar plugin X
- não alterar findMatchingRule / rewind / …

## Fora de âmbito
- o que parece daqui mas vive noutro plugin (nome + path do CONTEXT dele)
```

Limite: **60 linhas**. Se passar, o CONTEXT está a virar tutorial — cortar.

### AGENTS.md aninhado (quando usar)

Só se houver regras de **edição** que o CONTEXT não cubra, por exemplo:

```markdown
# intent-engine
Não adicionar família de catálogo sem teste em catalog.test.ts.
Não chamar interact() em perceive/cognize.
```

O escopo do AGENTS.md é a pasta e os filhos. Não repetir o mapa global.

---

## 3. Regras globais do que NÃO fazer

Estas regras existem para a IA **parar**. Detalhe em [INVARIANTES.md](INVARIANTES.md).

1. **Não segundo motor de regras.** Um `findMatchingRule`. Sempre.
2. **Não mudar o match** para classificar semântica. Semântica é rótulo.
3. **Não copiar Elm/Allegory** (`INTENT(open_door)`, `MODIFY(...)`). Idioma Lume: `JOGADOR.intent=attack`, `JOGADOR.hp-10`.
4. **Não plugin por categoria semântica** (nada de ConstraintEngine).
5. **Não categoria FEAR/FLEE/ATTACK.** Compor primitivas.
6. **Não a IA decidir o que a regra faz em runtime.**
7. **Não importar plugin↔plugin** em código novo. Capability + EventBus. (Há dívida antiga: ide-state importa libs. Não expandir.)
8. **Não criar ficheiro** se dá para editar o dono. CONTEXT diz o dono.
9. **Não gold-plating.** Pedido = fase. Sem TIME/PROCESS, sem tick de NPC, sem Inspector, salvo pedido.
10. **Não duplicar ProjectTree / CommandBar / PreviewPane.** Fonte: `src/plugins/ide-ui/lib/components/`. Live reexporta.
11. **Não limpar o registry global `RuleEffects` em testes de um plugin** se isso quebra outro.
12. **Não colocar knowledge em entidade `information`.** Tag `knows_<id>` no agent.
13. **Não emitir TypedEvent no `interact` síncrono e achar que o preview vê.** Preview usa `interactWith` síncrono; efeitos DO correm aí via registry.
14. **Não adicionar relógio / TIME** sem exemplo real a pedir.
15. **Não reescrever `bootstrap.ts` à mão sem atualizar** `platform-bootstrap.test.ts` (conta de plugins).

---

## 4. Como pedir (você) para a IA não vasculhar

Quanto mais o pedido nomear o **plugin** e a **fase**, menos busca.

| Pedido caro | Pedido barato |
|-------------|----------------|
| “arruma a sidebar” | “em `ide-ui` CONTEXT, ProjectTree: …” |
| “implementa o manifesto” | “Fase A do Rule System, sem TIME” |
| “melhora as regras” | “não mexer em `findMatchingRule`; só CONTEXT de rule-semantics” |
| “põe pasta nas entidades” | “sidebar tree em ide-state/lib/tree.ts + ProjectTree” |

Prefixos úteis no chat:

- `plugin:intent-engine`
- `não buscar, CONTEXT primeiro`
- `sem mais e sem menos`
- `não tocar no match`

---

## 5. Checklist: novo plugin

1. Pasta com CONTEXT.md (template §2) **antes** do código.
2. Uma linha em [MAPA.md](MAPA.md) (provides/requires/eventos).
3. Uma linha em [ROTEAMENTO.md](ROTEAMENTO.md) se o utilizador for falar disso.
4. `manifest.ts` + `types.ts` + `index.ts` + um teste de manifest.
5. `bootstrap.ts` + `platform-bootstrap.test.ts` (N plugins).
6. Se for verbo DO: handler em `RuleEffects.register`, teste no próprio plugin.
7. Nada de README longo.

## Checklist: pedido de feature

1. Abrir ROTEAMENTO.md → plugin.
2. Abrir CONTEXT.md do plugin.
3. Editar só os ficheiros da secção Abrir (+ teste).
4. Se o ficheiro certo não estava no CONTEXT, **acrescentar no CONTEXT no mesmo PR**.

## Checklist: a IA está a vasculhar (cheiro)

- mais de 8 `read_file` antes da primeira edição
- `list_dir` em `src/`
- `grep` sem `path:` de plugin
- abrir `engine.test.ts` inteiro por uma função

Parar. Voltar ao passo 0.

---

## 6. Métrica

Uma sessão “eficiente” neste repo:

- ≤ 4 reads de docs/ai + CONTEXT
- ≤ 3 reads de código antes de editar
- 0 `list_dir` acima de `src/plugins/<nome>`
- grep, se houver, com `path` de um plugin e `head_limit`

Se estourar, falta linha no MAPA ou no CONTEXT — corrigir o mapa, não “procurar melhor”.
