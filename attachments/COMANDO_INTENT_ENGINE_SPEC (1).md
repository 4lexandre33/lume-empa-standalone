# Especificação de Integração do Sistema de Comandos por Intenção

## Extensão de um Engine Narrativo semelhante ao Elm Narrative Engine

**Status:** Especificação arquitetural e funcional
**Objetivo:** orientar outra IA/agente de desenvolvimento na integração de uma interface textual baseada em `COMMAND -> INTENT` a um engine narrativo já existente.
**Princípio central:** preservar e reutilizar o núcleo já existente do projeto; adicionar somente as camadas necessárias para transformar comandos digitados em intenções contextualizadas que o engine consiga validar, executar e refletir no World Model.

---

# 1. Objetivo deste documento

Este documento descreve uma proposta de arquitetura para um sistema narrativo semelhante ao Elm Narrative Engine, porém com diferenças próprias do projeto atual.

A principal inovação a ser implementada é substituir ou complementar a interface tradicional baseada em opções clicáveis por uma **linguagem de comandos contextuais**.

O jogador poderá começar a digitar:

```text
intent.
```

e receber autocomplete dinâmico, por exemplo:

```text
PERCEIVE
COGNIZE
ACTION
```

Depois:

```text
intent.action.
```

pode gerar:

```text
MOVE
INTERACT
WAIT
...
```

Depois:

```text
intent.action.interact.
```

pode gerar:

```text
ATTACK
TALK
TAKE
GIVE
OPEN
USE
...
```

E finalmente:

```text
intent.action.interact.attack.
```

pode apresentar apenas os alvos válidos naquele contexto:

```text
GOBLIN_01
ORC_02
WOLF_01
```

O sistema não deve tratar esses itens como uma lista fixa de comandos. As opções precisam ser **derivadas do estado atual do mundo, das regras, do contexto, da perspectiva do agente e da taxonomia/herança/polimorfismo existentes no projeto**.

---

# 2. Regra mais importante: não reproduzir o ENE original literalmente

Esta especificação usa conceitos do Elm Narrative Engine como referência conceitual, mas o projeto atual **não deve ser reescrito para imitar o ENE original**.

A IA responsável pela implementação deve primeiro inspecionar o código existente e descobrir:

- qual é a estrutura real do World Model;
- como entidades são representadas;
- como Tags, Stats e Links são implementados;
- como as Rules são armazenadas;
- como Conditions são avaliadas;
- como Effects ou Actions são executados;
- como o fluxo narrativo já existente funciona;
- como cenas, escolhas ou interações já são representadas;
- se já existe sistema de eventos;
- se já existe parser ou comandos;
- se já existe autocomplete;
- se já existe taxonomia de tags;
- se já existe algum mecanismo de herança/polimorfismo;
- se existe uma camada de UI específica para escolhas.

**A arquitetura descrita abaixo deve ser adaptada ao sistema real.**

Não criar classes, arquivos, bancos, APIs ou motores paralelos simplesmente porque aparecem nesta documentação.

O objetivo é obter a mesma propriedade arquitetural com o mínimo de mudança possível.

---

# 3. Visão conceitual

A arquitetura proposta é:

```text
COMMAND
└── INTENT
    ├── PERCEIVE
    │   ├── OBSERVE
    │   ├── LOCATE
    │   ├── INSPECT
    │   ├── SEARCH
    │   ├── LISTEN
    │   ├── IDENTIFY
    │   └── ...
    │
    ├── COGNIZE
    │   ├── REMEMBER
    │   ├── FORGET
    │   ├── COMPARE
    │   ├── EVALUATE
    │   ├── INFER
    │   ├── DECIDE
    │   ├── SELECT
    │   ├── PLAN
    │   ├── IMAGINE
    │   └── ...
    │
    └── ACTION
        ├── MOVE
        ├── INTERACT
        ├── COMMUNICATE
        ├── CREATE
        ├── DESTROY
        ├── TRANSFER
        ├── CONTROL
        ├── EXPRESS
        ├── WAIT
        └── ...
```

A arquitetura de execução proposta é:

```text
PLAYER
  ↓
COMMAND
  ↓
PARSE
  ↓
INTENT
  ↓
INTENT RESOLVER
  ↓
WORLD / CONTEXT / RULE MATCHING
  ↓
VALID INTENT
  ↓
EXECUTION / EVENT / RULE ENGINE
  ↓
EFFECTS
  ↓
WORLD MODEL UPDATE
  ↓
NARRATIVE EVALUATION
  ↓
NARRATOR / PRESENTATION
  ↓
OUTPUT
```

A arquitetura precisa manter uma separação clara entre:

```text
linguagem do jogador
```

```text
intenção semântica
```

```text
lógica do mundo
```

```text
resultado da ação
```

```text
produção narrativa / apresentação
```

---

# 4. O que é COMMAND

`COMMAND` representa o que o jogador digitou.

Exemplo:

```text
intent.action.interact.attack.goblin_01
```

O texto acima é um comando, não é ainda uma ação executada.

O parser deve transformá-lo em uma representação estruturada.

Exemplo conceitual:

```json
{
  "root": "intent",
  "family": "action",
  "operation": ["interact", "attack"],
  "arguments": ["goblin_01"]
}
```

A implementação real pode usar outra estrutura se o projeto existente já possuir uma representação equivalente.

## Requisitos

O parser deve:

- aceitar o texto digitado;
- reconhecer segmentos válidos;
- distinguir palavra-chave de identificador de entidade;
- identificar argumentos posicionais ou nomeados;
- detectar comandos incompletos;
- detectar comandos inválidos;
- preservar o texto original para mensagens de erro/UI;
- não executar nada durante o parsing.

Parsing e execução devem ser etapas diferentes.

---

# 5. O que é INTENT

`INTENT` representa o objetivo semântico que o agente pretende realizar.

Exemplos:

```text
intent.action.interact.attack.goblin_01
```

significa conceitualmente:

> o agente pretende realizar uma ação de ataque tendo `GOBLIN_01` como alvo.

Outro exemplo:

```text
intent.perceive.observe.local
```

significa:

> o agente pretende obter informação sobre o que está perceptível localmente.

Outro:

```text
intent.cognize.evaluate.goblin_01
```

significa:

> o agente pretende avaliar cognitivamente o alvo.

`INTENT` é semântico. Ele não deve depender da aparência da interface.

---

# 6. Por que PERCEIVE, COGNIZE e ACTION

Essas três famílias foram selecionadas como um conjunto mínimo de alto nível após testar intenções de RPG/simulação contra diversos casos.

## 6.1 PERCEIVE

Representa aquisição deliberada de informação.

Exemplos:

```text
observe
look
listen
inspect
locate
search
identify
sense
```

Exemplos:

```text
intent.perceive.observe.local
intent.perceive.inspect.door
intent.perceive.locate.key
intent.perceive.listen.door
```

`PERCEIVE` não significa que toda percepção do personagem precise ser deliberada.

O engine pode possuir percepção automática/passiva separadamente.

A intenção `PERCEIVE` representa a decisão deliberada de procurar, observar, inspecionar ou obter determinada informação.

---

## 6.2 COGNIZE

Representa operações cognitivas deliberadas sobre informação/estado mental.

Exemplos:

```text
remember
forget
compare
evaluate
infer
decide
select
plan
imagine
reason
```

Exemplos:

```text
intent.cognize.remember.king
intent.cognize.evaluate.goblin_01
intent.cognize.compare.sword_01.sword_02
intent.cognize.decide.escape
intent.cognize.plan.escape
```

Atenção: `COGNIZE` não precisa representar todo e qualquer estado mental espontâneo. Emoções, crenças, memórias, planos e objetivos podem existir como dados do agente, enquanto certas operações deliberadas sobre eles podem ser intents cognitivas.

---

## 6.3 ACTION

Representa uma intervenção deliberada, execução ou transformação.

Exemplos:

```text
move
interact
communicate
create
destroy
transfer
control
express
wait
```

Exemplos:

```text
intent.action.move.cave
intent.action.interact.attack.goblin_01
intent.action.interact.talk.merchant_01
intent.action.communicate.ask.merchant_01
intent.action.transfer.give.apple.merchant_01
intent.action.wait
```

`ACTION` é deliberadamente amplo.

Não transformar automaticamente cada gênero de ação em uma nova primitiva.

---

# 7. INTERACT não é irmão de ACTION

A estrutura preferida é:

```text
INTENT
└── ACTION
    └── INTERACT
```

e não:

```text
INTENT
├── INTERACT
└── ACTION
```

`INTERACT` é uma família de ações direcionadas a uma entidade, sistema ou situação.

Exemplos:

```text
attack
 talk
take
give
open
close
use
push
pull
```

A implementação pode manter os nomes específicos já usados pelo projeto.

---

# 8. INTENT não deve conter a lógica completa da regra

Evitar isto:

```text
intent.action.attack {
    if health > 0 ...
    if distance < 10 ...
    damage = ...
}
```

Isso duplicaria o Rule Engine.

Preferir:

```text
INTENT
    ↓
resolve
    ↓
RULE ENGINE
    ↓
CONDITIONS
    ↓
EFFECTS
```

A intenção identifica o que o jogador quer fazer.

A regra continua responsável por decidir se isso é permitido e quais efeitos ocorrem.

---

# 9. A ponte entre comandos e Rules

A principal nova peça conceitual é uma ponte entre `INTENT` e a lógica já existente.

Ela pode ser chamada de:

```text
Intent Resolver
```

ou:

```text
Intent Binding
```

ou:

```text
Intent Adapter
```

O nome deve ser adaptado ao projeto.

Sua responsabilidade é pequena:

1. receber um Intent estruturado;
2. identificar quais regras/operações são aplicáveis;
3. resolver entidades e argumentos;
4. consultar condições existentes;
5. retornar as possibilidades válidas;
6. encaminhar o Intent validado para a execução existente.

Não criar um segundo Rule Engine.

---

# 10. Intent Definition

É recomendado ter uma definição declarativa dos tipos de intenção.

Exemplo conceitual:

```json
{
  "path": "action.interact.attack",
  "arguments": [
    {
      "name": "target",
      "type": "entity"
    }
  ],
  "candidateFilter": {
    "requiredTags": ["combatant"]
  }
}
```

Porém isso é apenas um exemplo.

Se o sistema já possui definições de ações, comandos, schemas, handlers ou regras equivalentes, reutilizar a estrutura existente.

A Intent Definition deve declarar principalmente:

- caminho da intenção;
- assinatura;
- tipos de argumentos;
- quais candidatos podem ser oferecidos;
- quais capacidades/contratos são relevantes;
- como encaminhar a intenção para o mecanismo existente.

Ela não deve duplicar a implementação dos efeitos.

---

# 11. Rules continuam sendo a autoridade

O autocomplete deve ser inteligente, mas não deve ser a autoridade final.

Exemplo:

```text
intent.action.interact.attack.
```

pode retornar:

```text
GOBLIN_01
ORC_02
```

Mas imediatamente antes da execução o sistema deve validar novamente.

Isso é necessário porque o estado pode ter mudado entre autocomplete e execução.

Exemplo:

```text
t0:
GOBLIN_01 existe

↓

autocomplete mostra GOBLIN_01

↓

outro evento mata/remova GOBLIN_01

↓

player executa comando

↓

Rule Engine verifica novamente

↓

comando rejeitado ou tratado como inválido
```

Regra fundamental:

```text
AUTOCOMPLETE = previsão contextual
RULE ENGINE = autoridade de validade
```

---

# 12. Como o autocomplete deve funcionar

O autocomplete não é uma lista estática.

Ele deve ser gerado pelo contexto atual.

## 12.1 Raiz

Entrada:

```text
intent.
```

O resolver procura as famílias disponíveis.

Resultado mínimo esperado:

```text
perceive
cognize
action
```

Mas, se determinada família não for aplicável ao contexto ou ao design do sistema, ela pode ser omitida.

---

## 12.2 Segundo nível

Entrada:

```text
intent.action.
```

O resolver consulta definições e contexto para descobrir quais ramos são relevantes.

Resultado possível:

```text
move
interact
wait
```

---

## 12.3 Terceiro nível

Entrada:

```text
intent.action.interact.
```

Resultado:

```text
attack
talk
take
give
open
use
```

Esses comandos são especializações existentes no projeto, não necessariamente primitivas universais.

---

## 12.4 Resolução do alvo

Entrada:

```text
intent.action.interact.attack.
```

Neste momento o sistema não deve simplesmente listar todos os NPCs do mundo.

Deve obter candidatos válidos para:

```text
ACTION.INTERACT.ATTACK
```

levando em conta, quando aplicável:

- posição;
- distância;
- visibilidade;
- tags;
- herança de tags;
- capabilities;
- estado do alvo;
- estado do ator;
- regras;
- pré-condições;
- relações;
- conhecimento;
- disponibilidade;
- bloqueios narrativos;
- contexto atual.

---

# 13. Herança de Tags

O projeto possui ou poderá possuir taxonomia de Tags.

Exemplo:

```text
goblin -> monster
monster -> creature
creature -> agent
```

Entidade:

```text
GOBLIN_01
    tags:
        goblin
```

O World Model pode resolver:

```text
hasTag(GOBLIN_01, "monster") == true
```

no modo de matching efetivo/polimórfico.

A entidade não precisa armazenar fisicamente as tags herdadas.

---

# 14. Polimorfismo

Herança e polimorfismo alimentam o resolver de comandos.

Uma definição genérica pode dizer:

```text
attack target where target hasTag monster
```

e a taxonomia permite que sejam candidatos:

```text
GOBLIN_01
ORC_01
DRAGON_01
```

sem criar uma regra específica para cada espécie.

Isso é fundamental para o autocomplete contextual.

---

# 15. Capabilities / contratos

Além da classificação taxonômica, o projeto pode utilizar Tags como capabilities.

Exemplos:

```text
combatant
talkable
takeable
openable
usable
carryable
```

Uma ação pode exigir determinada capability.

Exemplo:

```text
TALK
requires target.talkable
```

ou:

```text
TAKE
requires target.takeable
```

Isso permite que o autocomplete seja baseado naquilo que uma entidade consegue suportar, não somente em sua categoria nominal.

Não criar uma hierarquia paralela de capabilities sem necessidade. Reutilizar a infraestrutura de tags/matching existente, quando possível.

---

# 16. Contexto

A validade de uma intenção nunca deve depender apenas do seu texto.

Exemplo:

```text
intent.action.open.door_01
```

pode ser válido ou inválido conforme:

```text
PLAYER.location
DOOR.location
DOOR.locked
PLAYER.hasKey
PLAYER.canReach
```

Portanto o resolver precisa operar sobre:

```text
Intent + Actor + World State + Context
```

---

# 17. Perspectiva e conhecimento

`PERCEIVE` deve respeitar a perspectiva do agente.

Não assumir que o personagem conhece tudo que está no World Model.

Exemplo:

```text
DRAGON_01.location = CAVE
```

Mas o jogador nunca descobriu a existência do dragão.

Então:

```text
intent.perceive.locate.dragon
```

pode retornar:

```text
unknown
```

ou:

```text
not-known
```

dependendo do modelo de conhecimento existente.

O resolver deve reutilizar o sistema de conhecimento/percepção que o projeto já possuir. Não inventar uma epistemologia paralela sem necessidade.

---

# 18. Exemplo completo: atacar um goblin

World Model:

```text
PLAYER
    location -> CAVE
    tags -> [agent, combatant]

GOBLIN_01
    tags -> [goblin]
    location -> CAVE
    stats:
        health = 50
```

Taxonomia:

```text
goblin -> monster
monster -> creature
creature -> agent
```

Regra conceitual:

```text
RULE Attack

WHEN intent == action.interact.attack

AND actor.location == target.location
AND target hasTag combatant
AND actor hasTag combatant
AND actor.energy >= 10

THEN
    target.health -= actor.attack
    actor.energy -= 10
```

O jogador digita:

```text
intent.
```

Autocomplete:

```text
perceive
cognize
action
```

Digita:

```text
intent.action.
```

Autocomplete:

```text
move
interact
wait
```

Digita:

```text
intent.action.interact.
```

Autocomplete:

```text
attack
talk
take
give
open
use
```

Digita:

```text
intent.action.interact.attack.
```

Resolver consulta candidatos.

`GOBLIN_01` pode ser aceito por classificação/capability/contexto.

Autocomplete:

```text
GOBLIN_01
```

Comando completo:

```text
intent.action.interact.attack.GOBLIN_01
```

O parser gera:

```json
{
  "family": "action",
  "operation": "interact.attack",
  "actor": "PLAYER",
  "target": "GOBLIN_01"
}
```

O Intent Resolver verifica:

```text
actor existe
alvo existe
assinatura correta
contexto compatível
```

O Rule Engine verifica:

```text
mesma localização
combatant
energia suficiente
outras condições
```

Se verdadeiro:

```text
Effect:
GOBLIN_01.health -= 10
PLAYER.energy -= 10
```

O World Model é atualizado.

Depois o sistema narrativo avalia a nova situação.

---

# 19. Exemplo de percepção

Comando:

```text
intent.perceive.observe.local
```

O sistema pode resolver:

```text
PLAYER.location -> CAVE
```

e depois buscar entidades perceptíveis na região.

Resultado interno:

```json
{
  "type": "perception.result",
  "observer": "PLAYER",
  "scope": "local",
  "entities": [
    "TORCH_01",
    "DOOR_02",
    "GOBLIN_01"
  ]
}
```

A apresentação narrativa pode posteriormente transformar isso em texto narrativo.

Não confundir:

```text
perceber algo
```

com:

```text
narrar/descrever algo
```

São camadas diferentes.

---

# 20. Exemplo de COGNIZE

Comando:

```text
intent.cognize.evaluate.goblin_01
```

O sistema não precisa alterar o World Model físico.

Pode atualizar uma representação interna do agente, por exemplo:

```text
PLAYER.knowledge.assessment[GOBLIN_01]
```

ou usar o mecanismo cognitivo que o projeto já tiver.

O importante é que `COGNIZE` representa a intenção de realizar uma operação cognitiva, enquanto a estrutura interna da memória/conhecimento permanece pertencente ao modelo do projeto.

---

# 21. Intenções compostas

Algumas atividades não devem virar novas primitivas simplesmente porque utilizam várias operações.

Exemplo:

```text
INVESTIGATE
```

pode envolver:

```text
PERCEIVE
+
COGNIZE
```

Exemplo:

```text
EXPLORE
```

pode envolver:

```text
ACTION.MOVE
+
PERCEIVE
```

Exemplo:

```text
NEGOTIATE
```

pode envolver:

```text
PERCEIVE
+
COGNIZE
+
ACTION.COMMUNICATE
+
ACTION.TRANSFER
```

Não criar primitivas novas para atividades compostas apenas para facilitar o autocomplete.

---

# 22. Funções narrativas e intents são camadas diferentes

O projeto possui uma taxonomia narrativa:

```text
ESTABELECIMENTO
PERTURBAÇÃO
DIRECIONAMENTO
OPOSIÇÃO
REVELAÇÃO
RESOLUÇÃO
SELEÇÃO
CONSEQUÊNCIA
```

Essas funções não devem ser confundidas com tipos de Intent.

Exemplo:

```text
REVELAÇÃO
```

pode ocorrer quando:

```text
PERCEIVE -> descobrir informação
```

ou:

```text
ACTION.COMMUNICATE -> alguém revela informação
```

Portanto uma função narrativa não é necessariamente uma operação de entrada do jogador.

Da mesma forma:

```text
CONSEQUENCE
```

é resultado narrativo/causal, não uma intenção do jogador.

---

# 23. Funções do narrador e intents são camadas diferentes

O sistema possui as funções:

```text
REPRESENTAR
DESCREVER
ENUNCIAR
EXPOR
INTERIORIZAR
AVALIAR
FOCALIZAR
ESTRUTURAR
```

Essas funções controlam como o sistema/narrador representa e apresenta informações narrativas.

Não transformá-las em comandos do jogador sem uma justificativa específica.

Exemplos de correspondência possíveis:

```text
PERCEIVE
    -> fornece informação que pode ser DESCRITA

COGNIZE
    -> pode ser representado por INTERIORIZAR / AVALIAR

ACTION.COMMUNICATE
    -> pode resultar em ENUNCIAR / EXPOR
```

Essas relações são de integração entre camadas, não identidade ontológica.

---

# 24. Pipeline narrativo completo

O fluxo desejado é:

```text
PLAYER INPUT
      ↓
COMMAND PARSER
      ↓
INTENT
      ↓
INTENT RESOLVER
      ↓
WORLD + CONTEXT + TAG TAXONOMY + POLYMORPHISM
      ↓
RULE MATCHING
      ↓
EXECUTION
      ↓
EFFECTS
      ↓
WORLD MODEL UPDATED
      ↓
NARRATIVE FUNCTIONS
      ↓
NARRATOR FUNCTIONS
      ↓
PRESENTATION
```

Isso permite que o sistema seja guiado por ações do jogador sem abandonar o modelo narrativo.

---

# 25. Relação entre escolhas antigas e comandos

Uma interface antiga pode mostrar:

```text
O que fazer?

[Atacar Goblin]
[Falar com Mercador]
[Abrir Porta]
[Ir para Floresta]
```

Essas opções podem ser consideradas apenas uma representação visual dos intents disponíveis.

Exemplo:

```text
[Atacar Goblin]
```

é equivalente a:

```text
intent.action.interact.attack.goblin_01
```

Isso permite substituir a UI de escolhas sem necessariamente reescrever a lógica narrativa.

A interface pode inclusive oferecer os dois modos simultaneamente:

```text
Autocomplete textual
+
Botões de sugestão
```

ambos produzindo o mesmo Intent interno.

---

# 26. Arquitetura de integração mínima

A implementação deve procurar a menor alteração possível.

Preferência:

```text
[UI existente]
       ↓
[Command Parser]
       ↓
[Intent Resolver]
       ↓
[Engine existente]
```

Não fazer:

```text
[novo sistema de regras]
[novo World Model]
[novo sistema narrativo]
[novo sistema de efeitos]
```

quando o projeto já possuir equivalentes.

---

# 27. Possível organização de módulos

Somente como referência; adaptar ao código real.

```text
command/
    parser
    autocomplete

intent/
    definitions
    resolver
    validation
    execution-adapter

world/
    existing world model

taxonomy/
    existing tag taxonomy

rules/
    existing rule engine

narrative/
    existing narrative engine

narrator/
    existing narrator system
```

Não criar essa estrutura literalmente se a arquitetura existente usar outro padrão.

---

# 28. Interface do Intent Resolver

Uma interface conceitual pode ser:

```text
resolveIntentSuggestions(partialCommand, actor, context, world)
```

Retorna sugestões como:

```json
[
  {
    "token": "attack",
    "path": "intent.action.interact.attack",
    "kind": "operation",
    "valid": true
  }
]
```

Para resolução completa:

```text
resolveIntent(intent, actor, context, world)
```

Pode retornar:

```text
VALID
INVALID
UNKNOWN
AMBIGUOUS
NOT_PERMITTED
NOT_KNOWN
TARGET_UNAVAILABLE
```

Adaptar nomes ao projeto existente.

---

# 29. Autocomplete não deve usar string matching apenas

Não basta fazer:

```text
if startsWith("att") -> show attack
```

O autocomplete precisa conhecer semântica.

Exemplo:

```text
intent.action.interact.attack.
```

deve saber que o próximo token esperado provavelmente é um `ENTITY` que satisfaça determinada assinatura.

A definição de intenção deve fornecer uma espécie de assinatura:

```text
ATTACK
actor: AGENT
receiver/target: ENTITY
```

O resolver então busca candidatos.

---

# 30. Assinaturas de intenção

A profundidade do comando não deve ser fixa.

Exemplos:

```text
intent.action.wait
```

não possui alvo.

```text
intent.action.move.forest
```

possui destino.

```text
intent.action.interact.attack.goblin
```

possui alvo.

```text
intent.action.interact.give.apple.merchant
```

possui objeto e destinatário.

```text
intent.action.interact.use.key.door
```

possui objeto e alvo.

Portanto a gramática precisa permitir profundidade variável, mas com uma assinatura semântica que informe ao autocomplete o que é esperado em cada posição.

---

# 31. Exemplo de assinaturas

```text
MOVE
actor + destination

ATTACK
actor + target

TALK
actor + target

GIVE
actor + object + receiver

USE
actor + object + target

OPEN
actor + target

WAIT
actor

OBSERVE
actor + scope/target

LOCATE
actor + target/specifier

COMPARE
actor + objectA + objectB
```

Não é obrigatório armazenar isso exatamente dessa maneira. O importante é que o sistema possua uma representação equivalente.

---

# 32. Erros e mensagens

O sistema deve diferenciar:

```text
comando desconhecido
```

```text
comando incompleto
```

```text
argumento inexistente
```

```text
entidade existente mas indisponível
```

```text
entidade fora de contexto
```

```text
entidade desconhecida pelo agente
```

```text
regra impede execução
```

```text
comando válido mas impossível devido ao estado atual
```

Exemplo:

```text
> intent.action.interact.attack.goblin_01

O goblin não está mais aqui.
```

Isso é melhor do que um erro genérico de parser.

---

# 33. Não confundir autocomplete com permissões

O autocomplete pode sugerir algo porque é semanticamente compatível, mas a validação final continua obrigatória.

Da mesma forma, uma regra pode permitir algo que o autocomplete ainda não conseguiu descobrir devido a alguma limitação de apresentação.

O sistema deve buscar convergência progressiva entre os dois, sem tornar o autocomplete a autoridade do jogo.

---

# 34. Eventos

Se o projeto já possui um mecanismo de eventos, o Intent pode ser convertido para o formato de evento existente.

Exemplo:

```text
Intent
    ↓
Event
    ↓
Rules
```

Exemplo:

```json
{
  "type": "intent.action.interact.attack",
  "actor": "PLAYER",
  "target": "GOBLIN_01"
}
```

Não introduzir uma camada de eventos nova se o projeto já possui uma abstração equivalente.

---

# 35. Reutilização de Rules existentes

Essa é uma exigência central.

Caso o engine atual já tenha algo como:

```text
condition
trigger
action
effect
handler
rule
transition
```

o Intent Resolver deve adaptar-se a isso.

Exemplo:

```text
Intent
  ↓
existing action/trigger format
  ↓
existing rule matching
```

Em vez de:

```text
Intent
  ↓
new rule system
```

---

# 36. O que deve ser alterado nas Rules

Idealmente, apenas o suficiente para que o mecanismo consiga reconhecer a origem semântica do Intent.

Uma regra pode passar a aceitar uma condição conceitual como:

```text
intent.type == action.interact.attack
```

ou uma forma equivalente usando a estrutura já existente.

Não é obrigatório que a Rule Definition seja alterada se já existir um mecanismo de eventos/ações que possa representar o mesmo conceito.

A IA deve procurar a forma menos invasiva possível.

---

# 37. Possível integração com regras existentes

Exemplo conceitual:

```text
RULE Attack

TRIGGER:
    intent.action.interact.attack

CONDITIONS:
    actor.location == target.location
    target hasTag combatant
    actor hasTag combatant

EFFECTS:
    damage(target, actor.attack)
```

Se o projeto já possui `TRIGGER`, utilizar `TRIGGER`.

Se utiliza outra abstração, adaptar.

---

# 38. O que o usuário vê

A experiência desejada é semelhante a um terminal narrativo inteligente.

Exemplo:

```text
> intent.
```

Autocomplete:

```text
PERCEIVE
COGNIZE
ACTION
```

Usuário escolhe:

```text
ACTION
```

Sistema completa:

```text
> intent.action.
```

Autocomplete:

```text
MOVE
INTERACT
WAIT
```

Usuário seleciona:

```text
INTERACT
```

Resultado:

```text
> intent.action.interact.
```

Autocomplete:

```text
ATTACK
TALK
TAKE
GIVE
OPEN
USE
```

Usuário seleciona:

```text
ATTACK
```

Resultado:

```text
> intent.action.interact.attack.
```

Agora o autocomplete apresenta somente candidatos válidos.

---

# 39. O autocomplete deve ser contextual por estado

Exemplo A:

Jogador está em uma sala com:

```text
door
chest
goblin
```

Então:

```text
intent.action.interact.
```

pode mostrar:

```text
attack
talk
open
take
```

Exemplo B:

Jogador está numa área sem NPCs.

`talk` pode não aparecer.

Exemplo C:

Nenhum objeto coletável está próximo.

`take` pode não aparecer como ação utilizável naquele contexto.

Isso torna a árvore dinâmica.

---

# 40. Geração dinâmica da árvore

O sistema não deve possuir necessariamente um catálogo fixo de:

```text
attack -> goblin
attack -> orc
attack -> dragon
```

O sistema deve possuir:

```text
intent definition: ATTACK
```

mais:

```text
world model
```

mais:

```text
taxonomy/polymorphism
```

mais:

```text
rules/context
```

que geram os candidatos atuais.

---

# 41. Relação com World Model

O World Model continua sendo a fonte do estado factual do jogo.

O Intent Resolver deve consultar o World Model, e não duplicar suas entidades.

Exemplo:

```text
World Model:
GOBLIN_01
```

O resolver referencia:

```text
GOBLIN_01
```

Não cria outro `GoblinObject` em um sistema separado.

---

# 42. Relação com Tags, Stats e Links

Continuar usando as estruturas existentes.

Exemplo:

```text
GOBLIN_01.tags
GOBLIN_01.stats
GOBLIN_01.links
```

O resolver pode precisar de:

```text
TAG matching
STAT conditions
LINK traversal
```

mas isso deve ser feito utilizando os mecanismos existentes.

---

# 43. Exemplo com Link

```text
PLAYER.links.location -> CAVE
GOBLIN_01.links.location -> CAVE
```

Uma regra/contexto pode inferir:

```text
PLAYER and GOBLIN_01 share location
```

e então o candidato aparece para:

```text
intent.action.interact.attack.
```

---

# 44. Exemplo com Stat

```text
PLAYER.stats.energy = 5
```

Regra:

```text
energy >= 10
```

Então `ATTACK` pode ser conhecido como uma intenção válida semanticamente, mas não executável neste momento.

A UI pode decidir entre:

```text
não mostrar
```

ou:

```text
mostrar como indisponível
```

A decisão deve ser consistente em todo o projeto.

---

# 45. Exemplo com herança

Taxonomia:

```text
goblin -> monster
orc -> monster
dragon -> monster
```

Regra:

```text
target hasTag monster
```

Resultado:

```text
GOBLIN_01
ORC_01
DRAGON_01
```

Isso é polimorfismo de consulta.

Não criar uma regra para cada tipo concreto.

---

# 46. Uma ação pode ser polimórfica

A definição:

```text
ATTACK
```

pode ser aplicável a:

```text
monster
animal
vehicle
construct
```

desde que a taxonomia/capabilities e regras permitam.

O sistema não precisa conhecer todos os subtipos antecipadamente.

---

# 47. Regra fundamental para novas intents

Antes de criar um novo nível primitivo, testar se a operação pode ser representada como especialização de:

```text
PERCEIVE
COGNIZE
ACTION
```

Exemplos:

```text
COMMUNICATE -> ACTION
CREATE -> ACTION
DESTROY -> ACTION
TRANSFER -> ACTION
CONTROL -> ACTION
EXPRESS -> ACTION
MOVE -> ACTION
INTERACT -> ACTION
PLAN -> COGNIZE
DECIDE -> COGNIZE
EVALUATE -> COGNIZE
OBSERVE -> PERCEIVE
LOCATE -> PERCEIVE
INSPECT -> PERCEIVE
```

Não adicionar um quarto ramo apenas por conveniência.

---

# 48. Possível quarto ramo e conclusão atual

Foram testados conceitos como:

```text
COMMUNICATE
RELATE
CREATE
CONTROL
TRANSFER
EXPRESS
EXPLORE
EXPERIENCE
FEEL
GOAL
REQUEST
SELECT
PLAN
```

A maior parte é derivável das três famílias.

Portanto a configuração recomendada atualmente é:

```text
INTENT
├── PERCEIVE
├── COGNIZE
└── ACTION
```

Isso deve ser tratado como arquitetura mínima proposta, não como dogma. Se o código existente ou novos casos de uso provarem a necessidade de outra categoria, ela deve ser adicionada somente com justificativa arquitetural.

---

# 49. Relação com o ciclo cognitivo

A arquitetura cria um ciclo natural:

```text
WORLD
  ↓
PERCEIVE
  ↓
KNOWLEDGE / INFORMATION
  ↓
COGNIZE
  ↓
DECISION / INTENT
  ↓
ACTION
  ↓
WORLD CHANGE
  ↓
PERCEIVE
```

Isso não significa que cada turno precise obrigatoriamente passar pelas três etapas.

Um comando pode ser:

```text
ACTION
```

diretamente.

Outro pode ser:

```text
PERCEIVE
```

Outro:

```text
COGNIZE
```

E atividades complexas podem ser compostas.

---

# 50. Composição

O engine deve permitir que uma intenção de alto nível seja decomposta quando necessário.

Exemplo:

```text
intent.action.interact.attack.goblin
```

é uma intenção única para o usuário, mas pode gerar internamente vários efeitos:

```text
validate range
calculate damage
update health
consume resource
trigger reaction
```

O jogador não precisa conhecer essa implementação interna.

---

# 51. Intenção versus execução

Separar:

```text
INTENT = o que o agente quer realizar
```

de:

```text
ACTION EXECUTION = o que o motor efetivamente executa
```

Exemplo:

```text
intent.action.interact.attack.goblin
```

pode ser rejeitada.

Então intenção existe, mas ação não ocorreu.

Isso é útil para narrativa, logs, IA e debug.

---

# 52. Intenção versus efeito

Não confundir:

```text
Intent:
attack goblin
```

com:

```text
Effect:
goblin.health -= 10
```

A intenção é causa/solicitação.

O efeito é consequência da execução.

---

# 53. Intenção versus função narrativa

Não confundir:

```text
intent.action.interact.attack.goblin
```

com:

```text
PERTURBAÇÃO
```

O ataque pode causar uma perturbação.

A função narrativa descreve o papel daquele acontecimento na progressão narrativa.

---

# 54. Intenção versus função do narrador

Não confundir:

```text
intent.perceive.observe.local
```

com:

```text
DESCREVER
```

O jogador deseja observar.

O narrador pode responder descrevendo.

São operações distintas.

---

# 55. Compatibilidade com NPCs

A arquitetura não deve ser exclusiva do jogador.

O ideal é que NPCs também possam produzir intents.

Exemplo:

```text
NPC AI
  ↓
Intent.action.move.forest
  ↓
Intent Resolver
  ↓
Rules
```

Isso permite que o sistema compartilhe a mesma semântica entre:

```text
PLAYER
NPC
AUTOMATION
SCRIPT
NARRATIVE SYSTEM
```

O que muda é a fonte da intenção.

---

# 56. Benefício arquitetural

A interface de comandos vira apenas uma fonte de intents.

Podemos ter:

```text
TEXT INPUT
   ↓
INTENT
```

ou:

```text
BUTTON CLICK
   ↓
INTENT
```

ou:

```text
NPC AI
   ↓
INTENT
```

ou:

```text
SCRIPT
   ↓
INTENT
```

Todos convergem no mesmo pipeline.

---

# 57. Compatibilidade com UI clicável

Não é necessário remover imediatamente a interface de escolhas.

Pode-se manter:

```text
[Attack Goblin]
```

como uma representação visual que produz:

```text
intent.action.interact.attack.goblin_01
```

A interface textual pode coexistir com ela.

Isso reduz risco de regressão.

---

# 58. Fases recomendadas de implementação

## Fase 1 — inspeção

A IA deve mapear o código atual.

Produzir internamente um mapa de:

```text
World Model
Entity
Rule
Condition
Effect
Event
Narrative
UI choice
```

Não alterar nada antes dessa análise.

## Fase 2 — Intent model

Criar a representação mínima de Intent compatível com o projeto.

## Fase 3 — Parser

Transformar texto em Intent parcial/completo.

## Fase 4 — Autocomplete

Gerar sugestões da raiz para baixo.

## Fase 5 — Context Resolver

Integrar World Model, Tags, Links, Stats, Taxonomia e contexto.

## Fase 6 — Rule Adapter

Conectar Intent ao mecanismo de regras existente.

## Fase 7 — Execution

Executar através do pipeline já existente.

## Fase 8 — Narrativa

Garantir que mudanças de estado continuem alimentando o sistema narrativo/narrador.

## Fase 9 — NPCs / outras fontes

Opcionalmente permitir que outras partes do engine emitam intents.

---

# 59. Testes mínimos obrigatórios

## Parser

Testar:

```text
intent.
intent.action.
intent.action.interact.
intent.action.interact.attack.
intent.action.interact.attack.goblin_01
```

## Validação

Testar:

```text
alvo existe
alvo não existe
alvo conhecido
alvo desconhecido
alvo distante
alvo morto
ator sem recurso
ator fora de posição
```

## Taxonomia

Testar:

```text
goblin -> monster
```

E garantir que uma regra genérica de `monster` reconheça o goblin.

## Autocomplete

Verificar que candidatos mudam ao alterar o World Model.

## Corrida entre autocomplete e execução

Alterar o mundo depois da sugestão e antes da execução.

A execução deve revalidar.

---

# 60. Requisitos de UX

A experiência deve parecer exploração de um sistema semântico, não digitação de código obscuro.

O autocomplete deve:

- aparecer após `.`;
- permitir teclado;
- permitir clique;
- destacar a opção selecionada;
- exibir descrição curta quando útil;
- distinguir operações de entidades;
- indicar indisponibilidade de forma clara;
- aceitar seleção parcial;
- completar automaticamente quando existir apenas uma opção válida;
- permitir voltar ao nível anterior;
- lidar com nomes de entidades legíveis pelo usuário.

Exemplo visual:

```text
> intent.action.interact.attack.
                          ┌───────────────────┐
                          │ GOBLIN_01         │
                          │ ORC_02            │
                          │ WOLF_01           │
                          └───────────────────┘
```

---

# 61. IDs internos versus nomes apresentados

Não é necessário expor IDs técnicos diretamente ao usuário.

O sistema pode apresentar:

```text
Goblin
Orc
Velho Mercador
Porta de Carvalho
```

enquanto resolve internamente:

```text
goblin_01
orc_02
merchant_old_01
door_oak_01
```

Se houver ambiguidade, o autocomplete pode mostrar detalhes adicionais.

---

# 62. Ambiguidade

Se houver:

```text
goblin_01
 goblin_02
```

o comando:

```text
intent.action.interact.attack.goblin
```

não deve escolher arbitrariamente um deles.

O sistema pode:

```text
mostrar candidatos
```

ou exigir continuação:

```text
attack.goblin_01
attack.goblin_02
```

O resolver deve evitar decisões silenciosas incorretas.

---

# 63. Histórico e repetição

Comandos completos podem ser armazenados no histórico:

```text
intent.action.interact.attack.goblin_01
```

O usuário pode recuperar e reutilizar comandos anteriores.

Porém, ao repetir, o sistema deve validar novamente o contexto atual.

---

# 64. Logs e debug

É recomendável registrar separadamente:

```text
raw command
parsed command
resolved intent
selected target
matching rules
validation result
effects applied
```

Exemplo:

```text
RAW:
intent.action.interact.attack.goblin_01

INTENT:
action.interact.attack

ACTOR:
PLAYER

TARGET:
GOBLIN_01

MATCHED RULE:
Attack

RESULT:
SUCCESS
```

Isso facilitará extremamente a depuração.

---

# 65. Segurança e consistência

O parser nunca deve usar texto digitado diretamente para executar código arbitrário.

Toda entrada deve passar por:

```text
parse
→ validate
→ resolve
→ authorize/condition-check
→ execute
```

Não interpretar segmentos como JavaScript, SQL ou comandos de shell.

---

# 66. Performance

Autocomplete pode ser acionado a cada tecla.

Evitar recalcular o mundo inteiro desnecessariamente.

Quando possível:

- reutilizar índices existentes;
- cachear taxonomia;
- cachear matching de tags;
- limitar buscas ao contexto relevante;
- debouncing na UI quando necessário;
- distinguir resolução parcial de execução completa.

Não otimizar prematuramente sem medir o código real.

---

# 67. Estado parcial do comando

O parser deve suportar estados como:

```text
intent.
```

```text
intent.action.
```

```text
intent.action.interact.
```

Esses estados não são erros.

Eles são estados válidos de edição/autocomplete.

---

# 68. Estrutura interna recomendada

Exemplo conceitual:

```json
{
  "source": "player",
  "root": "intent",
  "family": "action",
  "operation": ["interact", "attack"],
  "arguments": {
    "target": "goblin_01"
  },
  "actor": "player"
}
```

Novamente: adaptar ao modelo existente.

---

# 69. Separação de responsabilidades

## COMMAND PARSER

Responsável por:

```text
texto -> estrutura
```

## AUTOCOMPLETE

Responsável por:

```text
estrutura parcial -> sugestões
```

## INTENT RESOLVER

Responsável por:

```text
intenção + contexto -> significado/alvos válidos
```

## RULE ENGINE

Responsável por:

```text
condições -> regras -> efeitos
```

## WORLD MODEL

Responsável por:

```text
estado do mundo
```

## NARRATIVE ENGINE

Responsável por:

```text
função e progressão narrativa
```

## NARRATOR

Responsável por:

```text
apresentação / discurso narrativo
```

---

# 70. Uma regra arquitetural crítica

Nunca fazer isto:

```text
Autocomplete
   ↓
executa diretamente efeito
```

Sempre:

```text
Autocomplete
   ↓
Intent
   ↓
Resolver
   ↓
Rule Engine / Existing Execution
```

---

# 71. Outro princípio crítico

Não fazer o parser conhecer detalhes da narrativa.

Por exemplo, o parser não precisa saber o que é `PERTURBAÇÃO`.

Ele só precisa transformar:

```text
intent.action.interact.attack.goblin_01
```

em Intent.

O que o ataque significa narrativamente pertence aos sistemas posteriores.

---

# 72. Outro princípio crítico

Não fazer o narrador conhecer a sintaxe do comando.

O narrador deve receber estado, eventos, resultados ou estruturas narrativas.

Ele não precisa saber se o usuário clicou:

```text
[Attack Goblin]
```

ou digitou:

```text
intent.action.interact.attack.goblin_01
```

Ambos devem convergir para o mesmo significado interno.

---

# 73. Arquitetura conceitual completa

```text
                         PLAYER
                           │
                           ▼
                     ┌─────────────┐
                     │  COMMAND    │
                     │   PARSER    │
                     └──────┬──────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   INTENT    │
                     └──────┬──────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
         PERCEIVE        COGNIZE         ACTION
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                 ┌────────────────────┐
                 │  INTENT RESOLVER   │
                 │                    │
                 │ World Model        │
                 │ Context            │
                 │ Tags               │
                 │ Stats              │
                 │ Links              │
                 │ Taxonomy            │
                 │ Inheritance        │
                 │ Polymorphism       │
                 │ Knowledge          │
                 │ Existing Rules     │
                 └──────────┬─────────┘
                            │
                            ▼
                 ┌────────────────────┐
                 │ EXISTING ENGINE    │
                 │ RULES / EVENTS /   │
                 │ EXECUTION          │
                 └──────────┬─────────┘
                            │
                            ▼
                       EFFECTS
                            │
                            ▼
                       WORLD MODEL
                            │
                            ▼
                  NARRATIVE FUNCTIONS
                            │
                            ▼
                   NARRATOR FUNCTIONS
                            │
                            ▼
                        OUTPUT
```

---

# 74. Resultado esperado do sistema

O jogador deixa de navegar apenas por opções pré-definidas e passa a explorar semanticamente o espaço de possibilidades do mundo.

Em vez de uma árvore fixa:

```text
Attack
  ├── Goblin
  ├── Orc
  └── Dragon
```

há uma árvore derivada do estado atual:

```text
intent
  ↓
family available now
  ↓
operation available now
  ↓
valid argument type
  ↓
matching entities now
  ↓
rule validation
  ↓
execution
```

Isso transforma o autocomplete em uma **janela sobre as possibilidades reais do mundo**, e não apenas em um sistema de sugestões textuais.

---

# 75. Requisito de adaptação ao projeto atual

A IA implementadora deve seguir este princípio acima de todos os outros:

> **Não copiar a implementação imaginada neste documento se o projeto atual já possui uma forma melhor de realizar a mesma função.**

Antes de criar ou modificar arquivos:

1. localizar as entidades reais;
2. localizar o World Model real;
3. localizar o mecanismo real de Rules;
4. localizar o mecanismo real de Conditions;
5. localizar o mecanismo real de Effects/Actions;
6. localizar o fluxo real das escolhas da UI;
7. localizar o mecanismo existente de eventos, caso exista;
8. localizar taxonomia/herança/polymorphism já implementados;
9. identificar o menor ponto de integração possível.

Depois disso, adaptar a proposta.

---

# 76. Estratégia de migração recomendada

Não remover imediatamente a interface antiga.

Primeiro implementar:

```text
Button Choice
    ↓
Intent
```

Isso cria um caminho unificado.

Depois:

```text
Text Command
    ↓
Intent
```

Assim:

```text
Button
   ──────────┐
             ├──> INTENT -> existing engine
Text command ┘
```

Essa abordagem reduz a chance de quebrar o sistema narrativo existente.

---

# 77. Critérios de sucesso

A implementação pode ser considerada funcional quando:

### 1. O jogador consegue iniciar com

```text
intent.
```

e obter:

```text
perceive
cognize
action
```

### 2. O autocomplete é contextual

As opções variam conforme o mundo.

### 3. Herança funciona

Uma regra que espera `monster` reconhece `goblin` quando a taxonomia informa:

```text
goblin -> monster
```

### 4. Polimorfismo funciona

A mesma ação pode aceitar múltiplos subtipos/capabilities.

### 5. O comando chega ao Rule Engine existente

Sem um segundo motor de regras.

### 6. O Rule Engine continua sendo autoridade

Mesmo que o mundo mude entre sugestão e execução.

### 7. Os efeitos continuam atualizando o World Model atual

Sem duplicação.

### 8. O sistema narrativo existente continua funcionando

Depois que o World Model muda.

### 9. O narrador continua independente da sintaxe do comando

Ele recebe os resultados da simulação.

---

# 78. Exemplo final de jornada completa

Estado inicial:

```text
PLAYER.location = TOWN

MERCHANT_01.location = TOWN
MERCHANT_01.tags = [merchant, talkable]

GOBLIN_01.location = FOREST
GOBLIN_01.tags = [goblin]
```

Jogador:

```text
intent.
```

Sistema:

```text
PERCEIVE
COGNIZE
ACTION
```

Jogador:

```text
intent.action.
```

Sistema:

```text
MOVE
INTERACT
WAIT
```

Jogador:

```text
intent.action.interact.
```

Sistema:

```text
TALK
GIVE
...
```

Jogador:

```text
intent.action.interact.talk.
```

Sistema consulta entidades compatíveis.

Resultado:

```text
MERCHANT_01
```

Comando final:

```text
intent.action.interact.talk.merchant_01
```

Resolver:

```text
actor = PLAYER
target = MERCHANT_01
operation = TALK
```

Rule Engine:

```text
PLAYER.location == MERCHANT.location
MERCHANT hasTag talkable
```

Resultado válido.

A execução gera efeitos/eventos apropriados.

O World Model muda, se necessário.

O Narrative Engine avalia a situação.

O Narrator produz a resposta.

A sintaxe digitada nunca precisou ser conhecida pelo narrador.

---

# 79. Resumo arquitetural para implementação

A implementação pretendida pode ser reduzida à seguinte ideia:

```text
COMMAND
   ↓
INTENT
   ↓
INTENT RESOLVER
   ↓
EXISTING WORLD + TAXONOMY + POLYMORPHISM + RULES
   ↓
EXISTING EXECUTION
   ↓
WORLD CHANGE
   ↓
NARRATIVE
   ↓
NARRATOR
```

As três famílias principais de Intent são:

```text
PERCEIVE
COGNIZE
ACTION
```

A intenção de ação pode possuir especializações como:

```text
ACTION
├── MOVE
├── INTERACT
├── COMMUNICATE
├── CREATE
├── DESTROY
├── TRANSFER
├── CONTROL
├── EXPRESS
└── WAIT
```

O autocomplete é dinâmico.

As entidades candidatas são geradas pelo estado atual.

Herança e polimorfismo tornam o matching genérico.

Rules continuam sendo a autoridade.

O World Model continua sendo a fonte de estado.

Narrativa continua sendo outra camada.

Narrador continua sendo outra camada.

E o comando textual passa a ser apenas uma nova forma de entrada para o mesmo sistema de simulação.

---

# 80. Instrução final para a IA implementadora

**Implemente esta arquitetura no sistema existente, não ao lado dele.**

Antes de alterar o código, inspecione a arquitetura já construída e mapeie os pontos equivalentes a:

```text
World Model
Entity
Rules
Conditions
Effects
Events
Narrative State
Choices
UI
Taxonomy
Inheritance
Polymorphism
```

Depois adapte:

```text
COMMAND
INTENT
PERCEIVE
COGNIZE
ACTION
INTENT RESOLVER
AUTOCOMPLETE
```

aos conceitos reais encontrados no projeto.

Não presuma que nomes, arquivos, APIs ou estruturas do Elm Narrative Engine original existam no sistema atual.

Não substitua componentes funcionais sem necessidade.

Não crie sistemas duplicados.

Não faça o autocomplete possuir regras próprias.

Não coloque lógica de efeitos dentro do parser.

Não faça o narrador interpretar comandos brutos.

Não faça a intenção executar efeitos diretamente sem passar pelo mecanismo de validação existente.

O resultado final deve permitir que o jogador interaja com o mesmo mundo e com as mesmas regras do sistema atual, mas por meio de uma linguagem textual contextual:

```text
intent.
→ perceive | cognize | action
→ especialização
→ alvo/argumentos válidos
→ resolução
→ regras existentes
→ efeitos
→ estado atualizado
→ narrativa
→ narrador
```

Essa é a finalidade desta extensão.
