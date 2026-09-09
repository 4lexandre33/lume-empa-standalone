export type RefSection = { id: string; title: string; body: string[]; sample?: string };

export const SYNTAX_REF: RefSection[] = [
  {
    id: "bloco",
    title: "Bloco de entidade",
    body: [
      "O id vai em maiúsculas. Ponto + Enter monta o bloco. tags, stats e links terminam com ponto-e-vírgula. Dentro da lista, Space vira vírgula + espaço — ids não têm espaço.",
      "name e description são propriedades visíveis, não tags. {ASTRONOMA.name} lê o campo name. Se faltar, a Lume humaniza o id (ASTRONOMA → Astronoma).",
    ],
    sample: `JOGADOR.{
tags: agent, personagem, casado;
stats: medo=10, vida=100, cabelo=40;
links: current_location=CASA01, amor=EMANUELE;
name: Você;
description: O jogador.
}`,
  },
  {
    id: "gavetas",
    title: "tags · stats · links · name",
    body: [
      "tags — etiquetas sem número: agent, object, place, event, information, abstract, hidden, sleeping, dark. Uma entidade casa com *.place se tiver a tag place.",
      "stats — números: medo=10, illumination=7. Dá para comparar e mudar.",
      "links — relações com outra entidade. current_location (em inglês) é o lugar onde a entidade está. O preview usa isso para saber o que mostrar.",
      "name / description — texto para o jogador. NÃO são tags. Não escreva 'name' na lista de tags.",
    ],
  },
  {
    id: "taxonomia",
    title: "Taxonomia: filho → pai",
    body: [
      "A aba Taxonomia fica entre Entidades e Regras. Cada linha é uma herança: tag → pai. Só um pai por tag. Pai desconhecido vira raiz. Comentários com # ou //.",
      "A entidade não ganha as tags do pai. GOBLIN com tags: goblin continua {goblin}. Consultas e regras ON/IF vêem os ancestrais: *.monster e *.agent casam.",
      "hidden nunca herda. Stats e links também não. Seta → ou ->. Ciclo, dois pais e linha inválida sublinham no caderno. Taxonomia vazia = motor antigo.",
      "A regra mais específica vence: ON: GOBLIN > *.goblin > *.monster > *.creature.",
      "A árvore ao lado lista os pais. Clique para ver impacto: entidades que herdam e regras ON/IF que citam a tag. No depurador, Efetiva (padrão) vê ancestrais; Direta ignora a taxonomia.",
    ],
    sample: `goblin → monster
monster → agent

ON: *.monster.!sleeping
narrativa: "O goblin já acordou."`,
  },
  {
    id: "regras",
    title: "ON · IF · DO · narrativa",
    body: [
      "ON: o que o jogador clicou (id, filtro ou start). Sem ON a regra não existe.",
      "IF: condição extra sobre o mundo agora. Pode haver vários IF; todos precisam ser verdadeiros.",
      "DO: o que muda. Várias linhas. Acrescenta tag, tira tag, muda número, muda ligação.",
      "narrativa: o único parágrafo que o jogador lê.",
    ],
    sample: `ON: CAVERNA.!explored
IF: *.object.current_location=JOGADOR.illumination>5
DO: JOGADOR.current_location=CAVERNA
narrativa: "Você entra, com a tocha à frente."`,
  },
  {
    id: "estrelas",
    title: "*  $  !",
    body: [
      "* — qualquer entidade. *.place = qualquer uma com a tag place. *.object, *.agent, *.event, *.information, *.abstract funcionam igual.",
      "$ — a entidade que o jogador acabou de clicar (o gatilho). Em ON: *.object, o $ é aquele objeto. {$.name} é o nome visível dele. $.current_location=JOGADOR põe o clicado no jogador.",
      "! — negação. CAVERNA.!explored = a caverna SEM a tag explored. *.object.!current_location=JOGADOR = objeto que NÃO está com o jogador.",
      "-tag no DO tira a tag: GOBLIN.-sleeping acorda o goblin.",
    ],
    sample: `ON: *.object.!current_location=JOGADOR
DO: $.current_location=JOGADOR
narrativa: "Você pega {$.name}."`,
  },
  {
    id: "numeros",
    title: "Números: comparar e mudar",
    body: [
      "Na pergunta (ON/IF): illumination>5, fear<4, fear>=9, fear=0. Um = só (não precisa de ==; == também é aceito). Operadores: > < >= <= =.",
      "No DO: fear=9 põe o valor; fear+2 soma; fear-1 diminui; fear*2 multiplica.",
      "Só stats (números) aceitam > < + - *. Links usam = : current_location=CAVERNA.",
    ],
    sample: `DO: JOGADOR.medo+2
    JOGADOR.medo*2
    JOGADOR.vida-1`,
  },
  {
    id: "chaves",
    title: "Chaves { } na narrativa",
    body: [
      "Propriedade: {ASTRONOMA.name} → o name da astrônoma. {TOCHA.description}. {$.name} → o name de quem você clicou.",
      "Pergunta: {JOGADOR.medo>4? o coração disparado | com coragem}. Se a pergunta for verdadeira, usa a primeira frase; senão, a segunda.",
      "Ciclo, sem pergunta, só barras: {primeira | segunda | já cansou}. Cada clique seguinte avança a opção e para na última. Pontos dentro do texto são permitidos.",
    ],
    sample: `ON: ZELADOR
narrativa: "{O zelador sacode um pano. 'A lente está aí.' | 'Não peço a chave.' | Ele já varreu o suficiente.}"`,
  },
  {
    id: "start",
    title: "start, especificidade, lugar",
    body: [
      "start() no caderno de entidades é o marco de abertura — não é uma entidade com tags/stats/links. O motor 'clica' nele ao ligar o preview. A regra ON: start é a primeira narrativa.",
      "Se duas regras servem para o mesmo clique, vence a que tem mais detalhes. Se empatam, vale a que está escrita mais acima. Regras genéricas (ON: *.object) ficam no fim.",
      "current_location é o nome do link que o preview consulta. Mantenha em inglês.",
    ],
  },
];
