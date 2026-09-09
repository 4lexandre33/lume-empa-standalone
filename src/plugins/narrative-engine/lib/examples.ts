import { createProject, type Project } from "./project.ts";

export type ExampleMeta = { id: string; name: string; genre: string; blurb: string; teaches: string };

export const EXAMPLE_CATALOG: ExampleMeta[] = [
  {
    id: "goblin-cave",
    name: "Caverna do Goblin",
    genre: "Aventura",
    blurb: "Tocha, escuridão, um goblin que não devia ser acordado.",
    teaches: "Tags, taxonomia, stats, links, IF.",
  },
  {
    id: "planetarium",
    name: "Planetário das Nove",
    genre: "Astronomia",
    blurb: "A cúpula está morta. A astrônoma pede a carta e a lente.",
    teaches: "{ENTIDADE.name}, $.name, relíquias, ciclo {a | b | c}.",
  },
];

const GOBLIN_ENTITIES = `JOGADOR.{
tags: agent;
stats: fear=0, courage=1;
links: current_location=ENTRADA;
}

ENTRADA.{
tags: place;
stats: ;
links: ;
name: Boca da caverna;
description: A pedra fria da entrada.
}

TRILHA.{
tags: place;
stats: ;
links: ;
name: Trilha da floresta;
}

CAVERNA.{
tags: place, dark;
stats: ;
links: ;
name: Caverna;
}

GOBLIN.{
tags: goblin, sleeping;
stats: ;
links: current_location=CAVERNA;
name: Goblin;
}

ISQUEIRO.{
tags: object;
stats: illumination=2;
links: current_location=JOGADOR;
name: Isqueiro;
description: Um isqueiro gasto.
}

TOCHA.{
tags: object;
stats: illumination=7;
links: current_location=ENTRADA;
name: Tocha;
description: Uma tocha no chão.
}

OURO.{
tags: object, quest_item;
stats: ;
links: current_location=CAVERNA, guarded_by=GOBLIN;
name: Saco de ouro;
}

start()
`;

const GOBLIN_RULES = `# start
ON: start
narrativa: "A boca da caverna se abre à sua frente. A {TOCHA.name} está no chão, ao lado de um isqueiro gasto."

# escuro demais
ON: *.place.dark
IF: JOGADOR.!current_location=$
IF: *.object.current_location=JOGADOR.illumination<6
narrativa: "Está escuro demais para entrar aí."

# entrar com luz
ON: CAVERNA.!explored
IF: *.object.current_location=JOGADOR.illumination>5
DO: JOGADOR.current_location=CAVERNA.fear+2
    CAVERNA.explored
narrativa: "Você entra, {JOGADOR.fear>4? o coração disparado | com coragem}. Um ronco horrível ecoa."

# cutucar goblin
ON: GOBLIN.sleeping
DO: GOBLIN.-sleeping
    JOGADOR.fear=9
narrativa: "Nunca se deve cutucar a onça com vara curta."

# goblin acordado
ON: *.monster.!sleeping
narrativa: "O goblin olha para você. Não deveria ter acordado."

# pegar objeto
ON: *.object.!current_location=JOGADOR
DO: $.current_location=JOGADOR
narrativa: "Você pega {$.name}."

# andar
ON: *.place
DO: JOGADOR.current_location=$
narrativa: "Você vai para {$.name}."
`;

const PLANET_ENTITIES = `JOGADOR.{
tags: agent;
stats: ;
links: current_location=CUPOULA;
}

CUPOULA.{
tags: place, morta;
stats: ;
links: ;
name: Cúpula;
description: A cúpula do planetário. Sem luz.
}

SALA_CARTAS.{
tags: place;
stats: ;
links: ;
name: Sala das cartas;
}

ASTRONOMA.{
tags: agent;
stats: ;
links: current_location=CUPOULA;
name: Astrônoma;
description: Não levanta a luneta.
}

ZELADOR.{
tags: agent;
stats: ;
links: current_location=SALA_CARTAS;
name: Zelador;
}

CARTA.{
tags: carta;
stats: ;
links: current_location=SALA_CARTAS;
name: Carta do céu;
}

LENTE.{
tags: lente;
stats: ;
links: current_location=SALA_CARTAS;
name: Lente;
}

start()
`;

const PLANET_RULES = `# start
ON: start
narrativa: "A sessão das nove não começou. A {ASTRONOMA.name} não levanta a luneta. 'A cúpula está morta. Traga a carta. Traga a lente.'"

# astrônoma ciclo
ON: ASTRONOMA
narrativa: "{Ela não se vira. 'A carta. A lente.' | 'Sem as duas, a cúpula continua morta.' | Ela já disse o que precisava.}"

# zelador ciclo
ON: ZELADOR
narrativa: "{O zelador sacode um pano. 'A lente está aí, embaixo da poeira.' | 'Não peço a chave. A cúpula é que pede.' | Ele já varreu o suficiente.}"

# acender cúpula
ON: CUPOULA.morta
IF: CARTA.current_location=JOGADOR
IF: LENTE.current_location=JOGADOR
DO: CUPOULA.-morta
narrativa: "A {ASTRONOMA.name} encaixa a {LENTE.name} na luneta. O céu da {CUPOULA.name} acende sobre vocês."

ON: CUPOULA.morta
narrativa: "A cúpula continua morta. Falta a carta e a lente."

ON: *.object.!current_location=JOGADOR
DO: $.current_location=JOGADOR
narrativa: "Você pega {$.name}."

ON: *.relic.current_location=JOGADOR
narrativa: "A relíquia {$.name} brilha na palma. Ainda é um objeto — e a cúpula precisa dela."

ON: *.place
DO: JOGADOR.current_location=$
narrativa: "Você vai para {$.name}."
`;

export function createExampleProject(id: string): Project {
  if (id === "planetarium") {
    return createProject("Planetário das Nove", {
      id: "planetarium",
      entitiesSource: PLANET_ENTITIES,
      taxonomySource: `# relíquias do planetário
carta → relic
lente → relic
relic → object
`,
      rulesSource: PLANET_RULES,
      extras: {},
      settings: { playerEntityId: "JOGADOR", debug: true },
    });
  }
  return createProject("Caverna do Goblin", {
    id: "goblin-cave",
    entitiesSource: GOBLIN_ENTITIES,
    taxonomySource: `# criaturas
goblin → monster
monster → agent
`,
    rulesSource: GOBLIN_RULES,
    extras: {},
    settings: { playerEntityId: "JOGADOR", debug: true },
  });
}
