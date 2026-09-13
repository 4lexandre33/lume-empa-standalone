# MANIFESTO DO RULE SYSTEM
## Sistema de Regras Semânticas para o Narrative Engine

### 1. PROPÓSITO

O sistema deve incorporar um **Rule System** capaz de representar as regras que governam o mundo narrativo, seus agentes, entidades, estados, eventos, relações, informações e processos.

A finalidade não é criar apenas um mecanismo de `if/else`, nem simplesmente permitir que Agents executem comandos.

O objetivo é estabelecer uma **camada semântica de regras** capaz de representar como o mundo funciona e como seus elementos podem:

- existir;
- mudar;
- relacionar-se;
- perceber e processar informação;
- possuir agência;
- executar processos;
- reagir a acontecimentos;
- ser limitados por condições;
- produzir consequências.

O sistema deve ser integrado **à arquitetura existente da aplicação**, e não imposto como uma arquitetura paralela.

A implementação deve preservar as estruturas, conceitos, convenções e mecanismos já existentes no projeto sempre que forem compatíveis. O Rule System deve complementar e ampliar o Narrative Engine, não substituí-lo indiscriminadamente.

---

# 2. REFERÊNCIAS CONCEITUAIS

O sistema deve ser desenvolvido tendo como referência principal a filosofia e os princípios do **Elm Narrative Engine**, complementados por conceitos presentes no **Allegory.js**.

Essas referências devem ser utilizadas como **inspiração arquitetural e conceitual**, e não como determinação de que a aplicação deva copiar suas implementações internas.

A aplicação possui identidade arquitetural própria.

Portanto:

> **Não copiar estruturas externas literalmente. Adaptar os conceitos ao modelo interno da aplicação.**

O Elm Narrative Engine deve servir como referência para a organização de regras narrativas, condições, ações, estados e eventos.

O Allegory.js deve servir como referência complementar para conceitos relacionados a mundo simulado, entidades, agentes, eventos, leis/regras, autonomia, processos reativos e comportamento emergente.

A integração deve resultar em uma solução coerente com a aplicação atual.

---

# 3. PRINCÍPIO FUNDAMENTAL

O Rule System deve separar quatro questões diferentes:

```text
COMO UMA REGRA É ESTRUTURADA?
        ↓
O QUE DISPARA A REGRA?
        ↓
O QUE A REGRA FAZ?
        ↓
QUAL É O SIGNIFICADO SEMÂNTICO DA REGRA?
```

Essas questões não devem ser confundidas.

A arquitetura conceitual é:

```text
RULE SYSTEM
│
├── PRIMITIVE STRUCTURE
│
├── TRIGGER PRIMITIVES
│
├── EFFECT PRIMITIVES
│
└── SEMANTIC LAYER
```

---

# 4. PRIMITIVE STRUCTURE

A estrutura primitiva de uma regra deve seguir o conceito:

```text
RULE
├── ON
├── IF
└── DO
```

### ON

Define o acontecimento, intenção, estado ou condição temporal que coloca a regra em avaliação.

### IF

Define as condições que precisam ser satisfeitas para que a regra seja aplicável.

### DO

Define os efeitos produzidos quando a regra é aplicável.

Conceitualmente:

```text
ON
  → quando avaliar

IF
  → sob quais condições

DO
  → o que produzir
```

O sistema não deve confundir essa estrutura com a camada semântica.

`ON`, `IF` e `DO` são **primitivas estruturais**.

---

# 5. TRIGGER PRIMITIVES

Os gatilhos fundamentais do sistema devem contemplar:

```text
TRIGGER PRIMITIVES
├── INTENT
├── EVENT
├── STATE
└── TIME
```

## INTENT

Representa uma intenção de realizar algo.

Exemplo:

```text
INTENT(open_door)
```

Uma intenção não deve ser tratada automaticamente como ação executada.

Ela representa uma tentativa, desejo ou solicitação de ação que poderá ser avaliada pelas regras do mundo.

---

## EVENT

Representa algo que aconteceu ou foi emitido no mundo.

Exemplo:

```text
EVENT(door_opened)
```

Eventos podem disparar outras regras.

---

## STATE

Representa uma condição ou configuração atual do mundo ou de uma entidade.

Exemplo:

```text
door.state == locked
```

Estados podem ser utilizados como gatilhos ou condições.

---

## TIME

Permite que o tempo participe do sistema de regras.

Exemplos conceituais:

```text
TIME(after 10 seconds)
TIME(at 18:00)
TIME(every hour)
TIME(duration exceeded)
```

A implementação concreta deve respeitar o modelo temporal já existente na aplicação.

---

# 6. EFFECT PRIMITIVES

Os efeitos fundamentais devem contemplar:

```text
EFFECT PRIMITIVES
├── MODIFY
├── RELATE
├── CREATE
├── DESTROY
├── EMIT EVENT
├── CREATE INTENT
└── UPDATE KNOWLEDGE
```

Essas primitivas representam **operações que o Rule System pode executar**.

---

## MODIFY

Modifica o estado ou propriedade de uma entidade.

Exemplo:

```text
MODIFY(agent.health, -10)
```

`MODIFY` é uma operação.

Seu significado semântico pode ser:

```text
TRANSFORMATION
```

---

## RELATE

Cria, remove ou altera uma relação entre entidades.

Exemplo:

```text
RELATE(agent, house, occupies)
```

`RELATE` é uma operação.

Seu significado semântico pode ser:

```text
RELATION
```

---

## CREATE

Cria uma nova entidade, objeto, evento, processo ou elemento permitido pelo modelo da aplicação.

Exemplo:

```text
CREATE(object)
```

Seu significado semântico pode estar relacionado a:

```text
LIFECYCLE
```

---

## DESTROY

Remove ou encerra uma entidade ou elemento do mundo.

Exemplo:

```text
DESTROY(object)
```

Seu significado semântico pode estar relacionado a:

```text
LIFECYCLE
```

A aplicação deve preservar a distinção entre remoção lógica, encerramento de existência e destruição física caso seu modelo necessite dessa diferença.

---

## EMIT EVENT

Produz um evento para o sistema.

Exemplo:

```text
EMIT EVENT(door_opened)
```

O evento pode então tornar-se gatilho de outras regras.

Isso permite encadeamento de comportamento sem que uma regra precise conhecer diretamente todas as regras que responderão ao evento.

---

## CREATE INTENT

Produz uma nova intenção.

Exemplo:

```text
CREATE INTENT(agent, flee)
```

Isso é particularmente importante para Agents autônomos.

Uma regra pode produzir uma intenção sem executar diretamente a ação correspondente.

A intenção deverá passar pelo sistema de agência e pelas restrições aplicáveis.

---

## UPDATE KNOWLEDGE

Atualiza aquilo que um Agent sabe ou acredita conhecer.

Exemplo:

```text
UPDATE KNOWLEDGE(agent, information)
```

Essa operação deve ser diferenciada da entidade `INFORMATION`.

A aplicação possui:

```text
ENTITY
└── INFORMATION
```

enquanto o processamento cognitivo dessa informação pertence à camada semântica:

```text
SEMANTIC LAYER
└── COGNITION
```

Portanto:

> **INFORMATION é uma entidade/dado do mundo. COGNITION representa o processamento cognitivo dessa informação por um Agent.**

A implementação deve preservar essa distinção.

Se a aplicação possuir um modelo mais preciso de memória, crença ou conhecimento, `UPDATE KNOWLEDGE` poderá ser adaptado ao modelo existente em vez de criar uma estrutura paralela desnecessária.

---

# 7. SEMANTIC LAYER

A Semantic Layer representa as categorias abstratas que descrevem **o significado de uma regra dentro do mundo simulado**.

A taxonomia fundamental é:

```text
SEMANTIC LAYER
├── CONSTRAINT
├── TRANSFORMATION
├── LIFECYCLE
├── RELATION
├── COGNITION
├── AGENCY
└── PROCESS
```

Essas categorias não são necessariamente operações.

Elas são **classificações semânticas**.

Uma regra pode possuir mais de uma classificação semântica.

Exemplo:

```text
RULE
├── ON: INTENT(open_door)
├── IF: door.unlocked
├── DO: MODIFY(door.state, open)
│
└── SEMANTICS
    ├── AGENCY
    ├── CONSTRAINT
    └── TRANSFORMATION
```

Isso deve ser permitido.

Não impor que uma Rule pertença obrigatoriamente a apenas uma categoria.

---

# 8. CONSTRAINT

`CONSTRAINT` representa as limitações, permissões, requisitos e condições que governam o que pode ou não acontecer.

Pergunta fundamental:

> **O que limita ou condiciona uma possibilidade?**

Exemplos:

```text
Agent cannot enter locked room.

Agent can use object only if object is accessible.

Action requires sufficient energy.

Door can only be opened from the correct side.
```

Constraints podem:

- impedir;
- permitir;
- exigir;
- condicionar;
- restringir;
- tornar uma ação impossível;
- determinar pré-requisitos.

Constraint não deve ser confundida com `IF`.

`IF` é uma primitiva estrutural da Rule.

`CONSTRAINT` é o significado semântico de uma regra de restrição.

---

# 9. TRANSFORMATION

`TRANSFORMATION` representa mudanças no estado, propriedades ou configuração de uma entidade ou do mundo.

Pergunta fundamental:

> **O que mudou?**

Exemplos:

```text
health: 100 → 80

door: closed → open

location: room_A → room_B

emotion: calm → afraid
```

Uma operação:

```text
MODIFY(...)
```

pode produzir semanticamente uma:

```text
TRANSFORMATION
```

Transformation não deve ser limitada a mudanças físicas.

Ela pode representar mudanças:

- físicas;
- espaciais;
- emocionais;
- cognitivas;
- sociais;
- temporais;
- abstratas;
- relacionais.

---

# 10. LIFECYCLE

`LIFECYCLE` representa a existência e o ciclo de vida de uma entidade ou processo.

Pergunta fundamental:

> **Como algo começa, permanece, muda de estágio e termina?**

Pode representar:

```text
CREATE
  ↓
EXISTENCE
  ↓
STATE CHANGES
  ↓
TERMINATION
```

Para Agents, isso pode representar:

```text
birth
growth
aging
death
```

Para objetos:

```text
creation
availability
degradation
destruction
```

Para processos:

```text
creation
execution
completion
termination
```

A aplicação deve adaptar os estados do lifecycle às estruturas existentes, evitando criar estados artificiais quando o modelo atual já possuir mecanismos equivalentes.

---

# 11. RELATION

`RELATION` representa vínculos semânticos entre entidades.

Pergunta fundamental:

> **Como duas ou mais entidades estão relacionadas?**

Exemplos:

```text
Agent → knows → Agent

Agent → owns → Object

Agent → occupies → Place

Object → belongs_to → Place

Agent → follows → Agent
```

A relação pode:

- surgir;
- desaparecer;
- mudar;
- possuir propriedades;
- possuir duração;
- possuir direção;
- depender de condições.

A operação:

```text
RELATE(...)
```

é a primitiva.

A classificação:

```text
RELATION
```

é o significado semântico.

---

# 12. COGNITION

`COGNITION` representa o processamento de informação por entidades capazes de percepção, conhecimento, memória, interpretação ou inferência.

Pergunta fundamental:

> **O que uma entidade sabe, percebe, interpreta, lembra ou infere?**

Pode abranger conceitos como:

```text
PERCEPTION
KNOWLEDGE
MEMORY
RECOGNITION
INTERPRETATION
INFERENCE
BELIEF
```

Esses conceitos não devem necessariamente ser transformados em novas categorias fundamentais.

Eles podem ser especializações ou operações dentro de `COGNITION`.

É fundamental manter:

```text
INFORMATION
```

e:

```text
COGNITION
```

semanticamente distintos.

`INFORMATION` representa algo que existe ou pode existir como entidade/dado no mundo.

`COGNITION` representa a relação cognitiva de um Agent ou entidade cognitiva com essa informação.

---

# 13. AGENCY

`AGENCY` representa a capacidade de uma entidade, especialmente um Agent, de produzir e selecionar comportamentos de maneira autônoma.

Pergunta fundamental:

> **Quem pode decidir ou iniciar uma ação, e por quê?**

Pode envolver:

```text
INTENTION
DECISION
GOAL
ACTION SELECTION
AUTONOMY
MOTIVATION
```

Uma intenção não deve ser automaticamente equivalente a uma ação.

O fluxo conceitual pode ser:

```text
PERCEPTION
    ↓
COGNITION
    ↓
AGENCY
    ↓
INTENT
    ↓
CONSTRAINT EVALUATION
    ↓
PROCESS
    ↓
EFFECT
    ↓
WORLD TRANSFORMATION
```

Esse fluxo deve ser adaptado ao modelo real da aplicação.

Não criar artificialmente todas essas etapas caso a arquitetura existente já possua equivalentes.

---

# 14. PROCESS

`PROCESS` representa acontecimentos ou ações que se desenvolvem ao longo do tempo.

Pergunta fundamental:

> **Como algo acontece entre seu início e seu término?**

Um processo pode possuir:

```text
START
↓
PROGRESS
↓
INTERRUPTION / PAUSE
↓
COMPLETION
```

ou:

```text
START
↓
FAILURE
```

Exemplos:

```text
walking
conversation
searching
eating
fighting
opening a door
learning something
travelling
```

Process não deve ser confundido com um simples `EVENT`.

Um evento representa uma ocorrência.

Um processo representa um desenvolvimento temporal.

---

# 15. RELAÇÃO ENTRE OS NÍVEIS

O sistema deve preservar a seguinte distinção:

```text
PRIMITIVE STRUCTURE
        ↓
como a Rule é formada

TRIGGER PRIMITIVES
        ↓
o que inicia sua avaliação

EFFECT PRIMITIVES
        ↓
o que ela pode produzir

SEMANTIC LAYER
        ↓
o que aquilo significa no mundo
```

Exemplo:

```text
RULE

ON:
    INTENT(open_door)

IF:
    door.unlocked == true

DO:
    MODIFY(door.state, OPEN)

SEMANTIC:
    AGENCY
    CONSTRAINT
    TRANSFORMATION
```

A Rule possui uma estrutura operacional simples, mas pode possuir significado semântico complexo.

---

# 16. PRINCÍPIO DE COMPOSIÇÃO

As sete categorias semânticas devem ser tratadas como **primitivas conceituais**, e não como uma lista fechada de comportamentos concretos.

Não criar uma nova categoria fundamental para cada comportamento.

Evitar estruturas como:

```text
FEAR
FLEE
LOVE
HUNGER
TALK
ATTACK
PERCEIVE
REMEMBER
```

como categorias semânticas fundamentais.

Esses comportamentos devem, quando possível, ser compostos pelas primitivas existentes.

Exemplo:

```text
Agent sees predator
        ↓
COGNITION

Agent evaluates predator as threat
        ↓
COGNITION

Agent decides to flee
        ↓
AGENCY

Agent attempts to flee
        ↓
INTENT

Environment prevents escape
        ↓
CONSTRAINT

Agent moves
        ↓
PROCESS

Agent changes location
        ↓
TRANSFORMATION
```

Assim, comportamentos complexos emergem da composição de regras fundamentais.

---

# 17. EMERGENCE

`EMERGENCE` não deve ser necessariamente uma oitava categoria da Semantic Layer.

Comportamentos emergentes devem ser tratados como resultado da combinação das regras.

Exemplo:

```text
COGNITION
+
AGENCY
+
CONSTRAINT
+
PROCESS
+
TRANSFORMATION
+
RELATION
```

pode produzir um comportamento emergente complexo sem existir uma Rule fundamental chamada:

```text
EMERGENCE
```

Isso mantém o sistema mais geral e evita aumentar desnecessariamente a quantidade de primitivas semânticas.

---

# 18. AGENTS NÃO DEVEM SER O CENTRO EXCLUSIVO DO RULE SYSTEM

O Rule System deve governar o **mundo**, não apenas os Agents.

Agents são participantes especialmente importantes porque possuem agência, cognição e autonomia.

Porém, outras entidades também podem participar das regras:

```text
AGENT
OBJECT
PLACE
EVENT
INFORMATION
ABSTRACT
```

Exemplos:

```text
AGENT → INTERACTS WITH → OBJECT

AGENT → OCCUPIES → PLACE

EVENT → TRANSFORMS → AGENT

OBJECT → EXISTS IN → PLACE

AGENT → COGNIZES → INFORMATION
```

O Rule System deve permitir que essas relações sejam expressas sem criar lógica especial e duplicada para cada tipo de entidade.

---

# 19. NÃO CONFUNDIR OPERAÇÃO COM SEMÂNTICA

Esta distinção é obrigatória.

```text
MODIFY ≠ TRANSFORMATION

RELATE ≠ RELATION

CREATE ≠ LIFECYCLE

CREATE INTENT ≠ AGENCY
```

O primeiro termo representa uma operação primitiva.

O segundo representa seu possível significado semântico.

Exemplo:

```text
DO:
    MODIFY(agent.health, -20)
```

pode ser classificado como:

```text
TRANSFORMATION
```

Outro:

```text
DO:
    RELATE(agent, object, owns)
```

pode ser classificado como:

```text
RELATION
```

A operação e sua classificação semântica devem permanecer conceptualmente separadas.

---

# 20. REGRAS PODEM POSSUIR MÚLTIPLAS SEMÂNTICAS

Não impor exclusividade.

Uma Rule pode simultaneamente envolver:

```text
AGENCY
CONSTRAINT
TRANSFORMATION
PROCESS
```

Exemplo:

```text
ON:
    INTENT(climb_wall)

IF:
    wall.climbable == true

DO:
    CREATE PROCESS(climbing)

SEMANTICS:
    AGENCY
    CONSTRAINT
    PROCESS
```

Se durante o processo a posição do Agent mudar:

```text
TRANSFORMATION
```

também poderá estar envolvida.

A classificação semântica deve representar o significado real da Rule, não limitar artificialmente sua expressividade.

---

# 21. PRINCÍPIO DE ADAPTAÇÃO À APLICAÇÃO

A aplicação deve **integrar os conceitos, não copiar cegamente a estrutura**.

Antes de criar qualquer novo módulo, classe, sistema ou API, verificar:

```text
Existe estrutura equivalente?
        ↓
Existe sistema de eventos equivalente?
        ↓
Existe modelo de estado equivalente?
        ↓
Existe sistema de entidades equivalente?
        ↓
Existe sistema de ações/intents equivalente?
        ↓
Existe mecanismo de processos equivalente?
```

Se existir, o Rule System deve utilizar ou estender esse mecanismo.

Não duplicar funcionalidades existentes.

A integração deve privilegiar:

```text
REUSE
EXTENSION
ADAPTATION
COMPOSITION
```

em vez de:

```text
DUPLICATION
REPLACEMENT
PARALLEL SYSTEMS
```

---

# 22. PRINCÍPIO DE COMPATIBILIDADE COM O NARRATIVE ENGINE

O Rule System não deve transformar o Narrative Engine em um simulador genérico desconectado da narrativa.

As regras devem continuar servindo à finalidade central do sistema:

```text
WORLD SIMULATION
        +
AGENT AUTONOMY
        +
NARRATIVE CONSEQUENCES
```

O sistema deve permitir que acontecimentos produzidos pela simulação possam alimentar o sistema narrativo.

Da mesma maneira, situações narrativas podem gerar eventos, intents, processos ou transformações no mundo.

A fronteira entre simulação e narrativa deve ser controlada por contratos claros.

---

# 23. PRINCÍPIO DE DETERMINAÇÃO

Uma Rule deve ser avaliável de forma suficientemente explícita para que o sistema consiga determinar:

```text
TRIGGER
+
CONDITIONS
+
EFFECTS
+
SEMANTIC CLASSIFICATION
```

O sistema não deve depender exclusivamente de interpretação livre da IA para decidir o que uma Rule significa.

A IA pode ajudar a criar, interpretar ou selecionar regras, mas a execução da regra deve possuir representação estruturada e verificável.

---

# 24. PRINCÍPIO DE COMPOSIÇÃO EM VEZ DE COMPLEXIDADE

O sistema deve preferir poucas primitivas altamente reutilizáveis a uma grande quantidade de comandos especializados.

O objetivo é permitir:

```text
FEW PRIMITIVES
      +
COMPOSITION
      ↓
COMPLEX BEHAVIOR
```

em vez de:

```text
MANY SPECIAL CASES
      ↓
FRAGILE RULE SYSTEM
```

As sete categorias semânticas devem funcionar como um vocabulário abstrato para descrever o comportamento do mundo.

---

# 25. OBJETIVO FINAL

O Rule System deve permitir que a aplicação represente, de forma estruturada, situações como:

```text
Um Agent deseja abrir uma porta.
```

```text
A porta está trancada.
```

```text
A regra impede a ação.
```

```text
O Agent percebe a restrição.
```

```text
O Agent procura uma chave.
```

```text
O Agent encontra uma informação.
```

```text
O Agent cria uma nova intenção.
```

```text
O Agent inicia um processo.
```

```text
A porta é aberta.
```

```text
O estado do mundo é transformado.
```

```text
Um evento é emitido.
```

```text
Outro Agent percebe o evento.
```

```text
Seu conhecimento é atualizado.
```

```text
Esse novo conhecimento influencia sua agência.
```

Tudo isso deve ser possível **sem criar uma regra fundamental específica para cada história ou comportamento**.

---

# 26. MODELO CONCEITUAL FINAL

A arquitetura desejada é:

```text
RULE SYSTEM
│
├── PRIMITIVE STRUCTURE
│   └── RULE
│       ├── ON
│       ├── IF
│       └── DO
│
├── TRIGGER PRIMITIVES
│   ├── INTENT
│   ├── EVENT
│   ├── STATE
│   └── TIME
│
├── EFFECT PRIMITIVES
│   ├── MODIFY
│   ├── RELATE
│   ├── CREATE
│   ├── DESTROY
│   ├── EMIT EVENT
│   ├── CREATE INTENT
│   └── UPDATE KNOWLEDGE
│
└── SEMANTIC LAYER
    ├── CONSTRAINT
    ├── TRANSFORMATION
    ├── LIFECYCLE
    ├── RELATION
    ├── COGNITION
    ├── AGENCY
    └── PROCESS
```

Esta estrutura deve ser considerada **um modelo conceitual de integração**, e não uma especificação para copiar literalmente.

A implementação deve analisar a arquitetura atual da aplicação e determinar a melhor forma de incorporar esses conceitos.

---

# 27. REGRA MESTRA

O princípio mais importante deste manifesto é:

> **O Rule System deve fornecer uma linguagem semântica mínima, composicional e extensível para representar como o mundo funciona, sem duplicar mecanismos já existentes e sem transformar cada comportamento concreto em uma nova categoria fundamental.**

O sistema deve ser:

```text
SEMANTICALLY EXPRESSIVE
COMPOSITIONAL
EXTENSIBLE
DETERMINISTICALLY EXECUTABLE
COMPATIBLE WITH THE EXISTING ENGINE
```

e deve manter uma separação clara entre:

```text
ENTITY
≠
RULE
≠
TRIGGER
≠
EFFECT
≠
SEMANTIC MEANING
```

O resultado esperado não é simplesmente "adicionar regras".

É transformar o Narrative Engine em um sistema no qual **Agents e demais entidades possam participar de um mundo regido por regras semânticas coerentes**, permitindo que autonomia, causalidade, transformação, conhecimento, relações, processos e restrições produzam consequências narrativas de maneira estruturada.