import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { compileProject, coerceProject, createProject } from "../../../narrative-engine/lib/project.ts";
import { createGame, interactWith, rewindTo } from "../../../narrative-engine/lib/runtime.ts";
import { cloneWorldModel } from "../../../narrative-engine/lib/world-model.ts";
import { exportSession, replaySession } from "../../../narrative-engine/lib/session.ts";
import { parsePadrao, bannerOf } from "../../../narrative-engine/lib/sift.ts";
import { buildPlayBundle, encodePlayHash, parseShareHash } from "../../../narrative-engine/lib/play-bundle.ts";
import { LIFE_MANIFEST, createLifePlugin } from "../../../life/index.ts";
import { NOTEBOOK_MANIFEST, createNotebookPlugin, compileNotebook, EMPTY_NOTEBOOK, slugOf, assistNotebook, slowRulesNote, parseCadernoView, replaceCover, applyNotebookToProject, parseCadernoLibrary, appendCaderno, exportCadernoMd, importCaderno, cadernoFilename, resetNotebookCache } from "../../index.ts";
import type { NotebookService } from "../../types.ts";

function worldOf(text: string) {
  const nb = compileNotebook(text);
  const project = createProject("caderno", {
    entitiesSource: `${nb.entitiesSource}\nstart()\n`,
    rulesSource: `${nb.rulesSource}\n# start\nON: start\nnarrativa: "ok"\n`,
    taxonomySource: nb.taxonomySource,
    extras: nb.extras,
  });
  return { nb, compiled: compileProject(project) };
}

function take(game: ReturnType<typeof createGame>, id: string) {
  const world = cloneWorldModel(game.worldModel);
  const actor = world.get(game.playerEntityId);
  if (actor) actor.links.intent = "take";
  return interactWith({ ...game, worldModel: world }, id);
}

describe("Notebook", () => {
  let core: Core;
  let notebook: NotebookService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(NOTEBOOK_MANIFEST, createNotebookPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-notebook");
    notebook = core.getService<NotebookService>("Notebook");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares Notebook and compiles empty text to empty sources", () => {
    assert.equal(NOTEBOOK_MANIFEST.name, "lume-notebook");
    assert.deepEqual(notebook.compile(""), EMPTY_NOTEBOOK);
    assert.deepEqual(compileNotebook(""), EMPTY_NOTEBOOK);
    assert.deepEqual(notebook.assist(""), { notes: [] });
    assert.deepEqual(assistNotebook(""), { notes: [] });
    assert.equal(slugOf("A Espada Enferrujada"), "ESPADA_ENFERRUJADA");
  });

  it("turns a north exit into a pair of rooms", () => {
    const { nb, compiled } = worldOf("A caverna leva ao norte para a floresta.");
    assert.equal(nb.issues.length, 0);
    assert.equal(nb.rulesSource, "");
    assert.equal(compiled.errors.length, 0);
    assert.ok(compiled.worldModel.get("CAVERNA")?.tags.has("place"));
    assert.equal(compiled.worldModel.get("CAVERNA")?.links.exit_n, "FLORESTA");
    assert.ok(compiled.worldModel.get("FLORESTA")?.tags.has("place"));
    assert.equal(compiled.worldModel.get("FLORESTA")?.links.exit_s, "CAVERNA");
  });

  it("places objects and people, tags, and section aliases", () => {
    const text = `## 2. Os Objectos
### 2.1 A Espada Enferrujada
A espada enferrujada está na caverna.
Ela é uma arma.
Ela é amaldiçoada.

## 3. As Pessoas
### 3.1 O Goblin
O goblin está na caverna.
Ele é hostil.
Ele é covarde.
`;
    const { nb, compiled } = worldOf(text);
    assert.equal(nb.issues.length, 0);
    const espada = compiled.worldModel.get("ESPADA_ENFERRUJADA");
    assert.ok(espada?.tags.has("object"));
    assert.ok(espada?.tags.has("weapon"));
    assert.ok(espada?.tags.has("cursed"));
    assert.equal(espada?.links.in, "CAVERNA");
    const goblin = compiled.worldModel.get("GOBLIN");
    assert.ok(goblin?.tags.has("agent"));
    assert.ok(goblin?.tags.has("vivo"));
    assert.ok(goblin?.tags.has("hostile"));
    assert.ok(goblin?.tags.has("covarde"));
    assert.equal(goblin?.links.in, "CAVERNA");
    assert.ok(compiled.worldModel.get("CAVERNA")?.tags.has("place"));
  });

  it("uses a description line as place extra and fails closed on junk", () => {
    const { nb, compiled } = worldOf(`### A Caverna
A caverna é húmida e fria.
blorple xyz.
Quando o jogador pega a espada:
`);
    assert.ok(nb.issues.some((issue) => issue.message === "Não percebi esta linha." && issue.line === 3));
    assert.equal(nb.issues.some((issue) => issue.line === 4), false);
    assert.match(nb.rulesSource, /ON: ESPADA/);
    assert.match(nb.rulesSource, /JOGADOR\.intent=take/);
    assert.equal(compiled.worldModel.get("CAVERNA")?.extra?.description, "A caverna é húmida e fria.");
    assert.ok(compiled.worldModel.get("ESPADA"));
  });

  it("compiles Quando/narre/cause/marque like a handwritten rule", () => {
    const text = `### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  narre "Sua mão recua como se uma onda de pavor a tivesse atingido."
  cause 5 de dano ao jogador.
  marque o jogador como "maldito".
`;
    const nb = compileNotebook(text);
    assert.equal(nb.issues.length, 0);
    assert.match(nb.rulesSource, /ON: ESPADA/);
    assert.match(nb.rulesSource, /IF: JOGADOR\.intent=take/);
    assert.match(nb.rulesSource, /JOGADOR\.hp - 5/);
    assert.match(nb.rulesSource, /JOGADOR\.maldito/);
    assert.match(nb.rulesSource, /Sua mão recua/);
    assert.equal(nb.rulesSource.includes("WAIT"), false);

    const hand = `# pega
ON: ESPADA
IF: JOGADOR.intent=take
DO: JOGADOR.hp - 5
    JOGADOR.maldito
narrativa: "Sua mão recua como se uma onda de pavor a tivesse atingido."
`;
    const entities = `${nb.entitiesSource}
start()
`;
    const fromNb = compileProject(createProject("nb", { entitiesSource: entities, rulesSource: `${nb.rulesSource}\n# start\nON: start\nnarrativa: "ok"\n` }));
    const fromHand = compileProject(createProject("hand", { entitiesSource: entities, rulesSource: `${hand}\n# start\nON: start\nnarrativa: "ok"\n` }));
    assert.equal(fromNb.errors.length, 0, fromNb.errors.map((e) => e.message).join("; "));
    assert.equal(fromHand.errors.length, 0);
    fromNb.worldModel.get("JOGADOR")!.stats.hp = 10;
    fromHand.worldModel.get("JOGADOR")!.stats.hp = 10;
    let g1 = narrative.bootGame(createGame(fromNb.worldModel, fromNb.rules, "JOGADOR", fromNb.taxonomy));
    let g2 = narrative.bootGame(createGame(fromHand.worldModel, fromHand.rules, "JOGADOR", fromHand.taxonomy));
    g1 = take(g1, "ESPADA");
    g2 = take(g2, "ESPADA");
    assert.equal(g1.worldModel.get("JOGADOR")?.stats.hp, 5);
    assert.equal(g2.worldModel.get("JOGADOR")?.stats.hp, 5);
    assert.equal(g1.worldModel.get("JOGADOR")?.tags.has("maldito"), true);
    assert.equal(g2.worldModel.get("JOGADOR")?.tags.has("maldito"), true);
    assert.ok(g1.story.includes("mão recua"));
    assert.ok(g2.story.includes("mão recua"));
  });

  it("warns on unknown verbs and a cada turno without emitting WAIT", () => {
    const nb = compileNotebook(`Quando o jogador blorple a espada:
  a cada turno:
  narre "x"
`);
    assert.ok(nb.issues.some((issue) => issue.line === 1));
    assert.ok(nb.issues.some((issue) => issue.line === 2));
    assert.equal(nb.rulesSource.includes("WAIT"), false);
    assert.equal(nb.rulesSource.includes("blorple"), false);
  });

  it("tears espada and maldição da espada into one id", () => {
    const nb = compileNotebook(`### A Espada
A espada está na caverna.
Ela é uma arma.

### A Maldição da Espada
A maldição da espada é sanguessuga.
Veja também: A Espada.
`);
    assert.equal(nb.issues.filter((issue) => issue.code === "W014").length, 0);
    assert.match(nb.entitiesSource, /^ESPADA\.\{/m);
    assert.equal(/MALDIC/i.test(nb.entitiesSource), false);
    const { compiled } = worldOf(`### A Espada
A espada está na caverna.

### A Maldição da Espada
A maldição da espada é sanguessuga.
`);
    assert.ok(compiled.worldModel.has("ESPADA"));
    const extras = [...compiled.worldModel.keys()].filter((id) => id !== "start" && id !== "CAVERNA" && id !== "JOGADOR");
    assert.deepEqual(extras, ["ESPADA"]);
  });

  it("warns W014 on missing Veja também and E020 on homonyms", () => {
    const missing = compileNotebook(`### A Espada
Veja também: Seção 9 — O Dragão.
`);
    assert.ok(missing.issues.some((issue) => issue.code === "W014" && issue.line === 2));

    const clash = compileNotebook(`### A Maldição da Espada
### A Maldição do Anel
A maldição está na caverna.
`);
    assert.ok(clash.issues.some((issue) => issue.code === "E020"));
  });

  it("registers também chamada and does not tear by similarity", () => {
    const { compiled } = worldOf(`### A Espada Enferrujada
também chamada: relíquia do goblin
A relíquia do goblin está na caverna.
`);
    assert.ok(compiled.worldModel.has("ESPADA_ENFERRUJADA"));
    assert.equal(compiled.worldModel.get("ESPADA_ENFERRUJADA")?.links.in, "CAVERNA");
    assert.equal(compiled.worldModel.has("RELIQUIA_DO_GOBLIN"), false);

    const similar = compileNotebook(`### A Espada
### A Escada
`);
    const ids = [...similar.entitiesSource.matchAll(/^([A-Z0-9_]+)\.\{/gm)].map((m) => m[1]);
    assert.ok(ids.includes("ESPADA"));
    assert.ok(ids.includes("ESCADA"));
  });

  it("omits inactive Maldições rules; ids stay put; old session still replays", () => {
    const base = `### A Espada
A espada está na caverna.

## 4. As Maldições
### A Maldição da Espada
Quando o jogador pega a espada:
  narre "Sua mão recua."
  cause 5 de dano ao jogador.
`;
    const off = `### A Espada
A espada está na caverna.

## 4. As Maldições
activa: não
### A Maldição da Espada
Quando o jogador pega a espada:
  narre "Sua mão recua."
  cause 5 de dano ao jogador.
`;
    const moved = `## 9. Outra pasta
### A Espada
A espada está na caverna.
`;
    const onNb = compileNotebook(base);
    const offNb = compileNotebook(off);
    assert.match(onNb.rulesSource, /JOGADOR\.hp - 5/);
    assert.equal(offNb.rulesSource.includes("hp"), false);
    assert.match(offNb.entitiesSource, /^ESPADA\.\{/m);
    assert.equal(/MALDIC/i.test(offNb.entitiesSource), false);
    const movedNb = compileNotebook(moved);
    assert.match(movedNb.entitiesSource, /^ESPADA\.\{/m);

    const withPlayer = (source: string) =>
      /JOGADOR\.\{/.test(source)
        ? `${source}\nstart()\n`
        : `JOGADOR.{ tags: agent; stats: hp=10; links: ; name: Jogador; }\n${source}\nstart()\n`;

    const onProj = createProject("on", {
      entitiesSource: withPlayer(onNb.entitiesSource),
      rulesSource: `${onNb.rulesSource}\n# start\nON: start\nnarrativa: "ok"\n`,
    });
    const onCompiled = compileProject(onProj);
    assert.equal(onCompiled.errors.length, 0);
    onCompiled.worldModel.get("JOGADOR")!.stats.hp = 10;
    let live = narrative.bootGame(createGame(onCompiled.worldModel, onCompiled.rules, "JOGADOR", onCompiled.taxonomy));
    live = take(live, "ESPADA");
    assert.equal(live.worldModel.get("JOGADOR")?.stats.hp, 5);
    const snapshot = exportSession(live);
    const rewound = rewindTo(live, 0);
    assert.equal(rewound.worldModel.get("JOGADOR")?.stats.hp, 10);
    const replayed = replaySession(snapshot, onCompiled.rules, "JOGADOR", onCompiled.taxonomy);
    assert.equal(replayed.history.length, snapshot.triggerIds.length);
    assert.equal(live.worldModel.get("JOGADOR")?.stats.hp, 5);

    const offCompiled = compileProject(createProject("off", {
      entitiesSource: withPlayer(offNb.entitiesSource),
      rulesSource: `${offNb.rulesSource}\n# start\nON: start\nnarrativa: "ok"\n`,
    }));
    offCompiled.worldModel.get("JOGADOR")!.stats.hp = 10;
    let fresh = narrative.bootGame(createGame(offCompiled.worldModel, offCompiled.rules, "JOGADOR", offCompiled.taxonomy));
    fresh = take(fresh, "ESPADA");
    assert.equal(fresh.worldModel.get("JOGADOR")?.stats.hp, 10);
    assert.equal(live.worldModel.get("JOGADOR")?.stats.hp, 5);
  });

  it("chains LIVE for a nearby coward goblin and WAIT on a cada turno; dry-run lists only", async () => {
    const turno = compileNotebook(`### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  a cada turno:
    cause 1 de dano ao jogador.
`);
    assert.equal(turno.issues.length, 0);
    assert.match(turno.rulesSource, /WAIT 1\.FUSE_/);
    assert.match(turno.rulesSource, /JOGADOR\.hp - 1/);
    assert.equal(turno.rulesSource.includes("LIVE"), false);

    const text = `### A Caverna
A caverna é húmida e fria.
O jogador está na caverna.

### O Goblin
O goblin está na caverna.
Ele é covarde.

### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  narre "A lâmina canta."
  Quando o goblin é marcado como "covarde":
    narre "O goblin recua."
    marque o goblin como "alerta".
`;
    const { nb, compiled } = worldOf(text);
    assert.equal(nb.issues.length, 0);
    assert.match(nb.rulesSource, /DO: LIVE/);
    assert.match(nb.rulesSource, /ON: GOBLIN/);
    assert.equal(compiled.errors.length, 0);

    compiled.worldModel.get("JOGADOR")!.links.in = "CAVERNA";
    const game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    const world = cloneWorldModel(game.worldModel);
    const actor = world.get("JOGADOR");
    if (actor) actor.links.intent = "take";
    const hypot = { ...game, worldModel: world };
    const report = narrative.dryRun(hypot, "ESPADA");
    assert.ok(report.effects.some((effect) => effect.verb === "live"));
    assert.equal(hypot.worldModel.get("GOBLIN")?.tags.has("alerta"), false);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), false);

    core.registerPlugin(LIFE_MANIFEST, createLifePlugin);
    await core.activatePlugin("lume-life");
    let played = take(hypot, "ESPADA");
    assert.equal(played.worldModel.get("GOBLIN")?.tags.has("alerta"), true);
    assert.ok(played.history.some((beat) => beat.triggerId === "GOBLIN"));
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), false);
  });

  it("compiles Canais and Histórias into channel + PADRAO; weight only on the banner", () => {
    const text = `## Canais
O canal "corrupção" tem três estados:
  - limpo
  - corrompido
  - exposto
Transições:
  limpo → corrompido (suborno aceito)

## Histórias
Padrão: A Corrupção do Guarda
  - suborno
  - aceite
Significância: 0.85

Padrão: Um Eco
  - eco
Significância: 0.1
`;
    const { nb, compiled } = worldOf(text);
    assert.equal(nb.issues.length, 0);
    assert.match(nb.taxonomySource, /channel → abstract/);
    assert.match(nb.entitiesSource, /CORRUPCAO\.\{/);
    assert.match(nb.entitiesSource, /tags: channel/);
    assert.match(nb.entitiesSource, /state=0/);
    assert.equal(nb.extras.CORRUPCAO?.states, "limpo, corrompido, exposto");
    assert.match(nb.rulesSource, /CORRUPCAO\.intent=advance/);
    assert.match(nb.rulesSource, /CORRUPCAO\.state \+ 1/);
    assert.match(nb.rulesSource, /suborno aceito/);
    assert.match(nb.patterns, /PADRAO CORRUPCAO_DO_GUARDA/);
    assert.match(nb.patterns, /eventos: SUBORNO, ACEITE/);
    assert.match(nb.patterns, /extra: weight=0.85/);
    assert.match(nb.rulesSource, /PADRAO CORRUPCAO_DO_GUARDA/);
    assert.equal(compiled.errors.length, 0);
    const patterns = parsePadrao(nb.rulesSource);
    assert.equal(patterns[0]?.extra?.weight, "0.85");
    const hits = [
      { id: "eco", name: "Um Eco", at: 1, weight: 0.1 },
      { id: "corr", name: "A Corrupção do Guarda", at: 2, weight: 0.85 },
    ];
    assert.equal(bannerOf(hits), "A Corrupção do Guarda · Um Eco");
    assert.equal(compiled.patterns.some((p) => p.id === "CORRUPCAO_DO_GUARDA"), true);
    assert.equal(typeof compiled.patterns[0]?.extra?.weight === "string" || compiled.patterns.some((p) => p.extra?.weight === "0.85"), true);
  });

  it("assists in prose: issues, dry-run, gaps, duplicates, no code", () => {
    const junk = assistNotebook(`### A Caverna
blorple xyz.
`);
    assert.ok(junk.notes.some((note) => note === "Não percebi a linha 2."));

    const twice = assistNotebook(`### A Caverna
### A Caverna
`);
    assert.ok(twice.notes.some((note) => note === "Já há uma A Caverna."));

    const play = assistNotebook(`### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  cause 5 de dano ao jogador.
  marque o jogador como "maldito".
Quando o jogador pega a espada:
  narre "outra."
  cause 1 de dano ao jogador.
`);
    assert.ok(play.notes.some((note) => note.includes("Duas reacções para pegar a espada")));
    assert.ok(play.notes.some((note) => note === "Se o jogador pegar a espada: dano 5, tag maldito. Nenhuma acção foi executada."));
    assert.ok(play.notes.some((note) => note.includes(".lume.caderno.md")));
    assert.ok(play.notes.some((note) => note.includes("Adicionei ‘A Espada’ ao índice.")));
    assert.equal(play.notes.some((note) => /ON:|IF:|DO:|matcher|JSON|ECS|intent=/.test(note)), false);

    const gap = assistNotebook(`### O Goblin
O goblin está na caverna.
Ele é covarde.
`);
    assert.ok(gap.notes.some((note) => note === "O goblin é vivo e não tem reacção."));

    const live = assistNotebook(`### O Goblin
O goblin está na caverna.
Ele é covarde.
O jogador está na caverna.
### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  os NPCs ao redor ficam preocupados.
`);
    assert.ok(live.notes.some((note) => note === "O goblin no mesmo sítio reagiria (covarde)."));
    assert.equal(slowRulesNote(501), "Muitas regras; o play pode ficar lento.");
    assert.equal(slowRulesNote(500), null);
  });

  it("parses caderno pages, cover, comments, and hides motor hash lines", () => {
    const text = `CADERNO: A Caverna Amaldiçoada
Autora: Maria
Data: 13 de setembro de 2026
Dedicatória: Para quem ousa descer.

## 1. As Salas
### 1.1 A Caverna
A caverna é húmida. // margem fria
# ON: start
`;
    const view = parseCadernoView(text);
    assert.equal(view.cover.title, "A Caverna Amaldiçoada");
    assert.equal(view.cover.author, "Maria");
    assert.equal(view.cover.dedication, "Para quem ousa descer.");
    assert.ok(view.toc.some((item) => item.id === "capa"));
    assert.ok(view.toc.some((item) => item.title.includes("A Caverna")));
    const page = view.pages.find((item) => item.title.includes("A Caverna"));
    assert.ok(page?.body.includes("húmida"));
    assert.equal(page?.body.includes("ON:"), false);
    assert.deepEqual(page?.comments, ["margem fria"]);
    const named = replaceCover(text, { ...view.cover, title: "Outro" });
    assert.match(named, /^CADERNO: Outro/m);
    const emptyCover = parseCadernoView("");
    assert.equal(emptyCover.cover.title, "");
    assert.equal(emptyCover.cover.author, "");

    const applied = applyNotebookToProject({
      entitiesSource: "start()\n",
      rulesSource: "# start\nON: start\nnarrativa: \"ok\"\n",
      taxonomySource: "",
      extras: {},
      notebooksSource: `### A Espada
A espada está na caverna.
`,
      meta: { name: "x" },
    });
    assert.match(applied.entitiesSource, /ESPADA/);
    const cave = applyNotebookToProject({
      entitiesSource: "JOGADOR.{ tags: agent; }\nstart()\n",
      rulesSource: "# start\nON: start\nnarrativa: \"ok\"\n",
      taxonomySource: "",
      extras: {},
      notebooksSource: "",
      meta: { name: "cave" },
    });
    assert.equal(cave.entitiesSource, "JOGADOR.{ tags: agent; }\nstart()\n");
  });

  it("keeps the first caderno when Magia is added and builds a global index", () => {
    const text = `CADERNO: A Caverna Amaldiçoada
### A Espada
A espada está na caverna.

CADERNO: Magia
### O Mago
O mago está na torre.
O feitico está na torre.
`;
    const nb = compileNotebook(text);
    assert.match(nb.entitiesSource, /ESPADA/);
    assert.match(nb.entitiesSource, /MAGO/);
    assert.match(nb.entitiesSource, /FEITICO/);
    const lib = parseCadernoLibrary(text);
    assert.equal(lib.books.length, 2);
    assert.equal(lib.books[0]?.cover.title, "A Caverna Amaldiçoada");
    assert.equal(lib.books[1]?.cover.title, "Magia");
    assert.ok(lib.toc.some((item) => item.title.includes("A Espada")));
    assert.ok(lib.toc.some((item) => item.title.includes("O Mago")));
    const firstOnly = parseCadernoView(text);
    assert.equal(firstOnly.cover.title, "A Caverna Amaldiçoada");
    assert.equal(firstOnly.pages.some((page) => page.title.includes("O Mago")), false);
    const magiaCover = replaceCover(text, { ...lib.books[1]!.cover, author: "Ana" }, lib.books[1]!.id);
    assert.match(magiaCover, /CADERNO: A Caverna Amaldiçoada/);
    assert.match(magiaCover, /CADERNO: Magia/);
    assert.match(magiaCover, /Autora: Ana/);
    const applied = applyNotebookToProject({
      entitiesSource: "start()\n",
      rulesSource: "# start\nON: start\nnarrativa: \"ok\"\n",
      taxonomySource: "",
      extras: {},
      notebooksSource: text,
      meta: { name: "x" },
    });
    assert.equal(applied.meta.name, "A Caverna Amaldiçoada");
    assert.match(applied.entitiesSource, /ESPADA/);
    assert.match(applied.entitiesSource, /MAGO/);
    const notes = assistNotebook(text).notes;
    assert.ok(notes.some((note) => note === "Índice: A Caverna Amaldiçoada, Magia."));
    const grown = appendCaderno(text);
    assert.match(grown, /CADERNO: Magia/);
    assert.equal(grown.includes("CADERNO: Magia\n\nCADERNO: Magia"), false);
    assert.match(grown, /\n\nCADERNO:\n$/);
    assert.equal(nb.issues.some((issue) => issue.code === "W021"), false);
  });

  it("exports .lume.caderno.md with credits and concatenates on import; #play= after compile", () => {
    const cave = `CADERNO: A Caverna Amaldiçoada
Autora: Maria
### A Espada
A espada está na caverna.
`;
    const magia = `CADERNO: Magia
Autora: Ana
### O Mago
O mago está na torre.
`;
    const md = exportCadernoMd(cave);
    assert.match(md, /Autora: Maria/);
    assert.equal(cadernoFilename("A Caverna Amaldiçoada"), "caverna-amaldicoada.lume.caderno.md");
    assert.equal(notebook.cadernoFilename("Magia"), "magia.lume.caderno.md");
    const joined = importCaderno(cave, magia);
    assert.match(joined, /CADERNO: A Caverna Amaldiçoada/);
    assert.match(joined, /Autora: Maria/);
    assert.match(joined, /CADERNO: Magia/);
    assert.match(joined, /Autora: Ana/);
    const nb = compileNotebook(joined);
    assert.match(nb.entitiesSource, /ESPADA/);
    assert.match(nb.entitiesSource, /MAGO/);
    const again = importCaderno(joined, "### O Feitiço\nO feitico está na torre.\n");
    assert.match(again, /CADERNO: Magia/);
    assert.match(again, /O Feitiço/);
    const lib = parseCadernoLibrary(joined);
    const onlyMagia = exportCadernoMd(joined, lib.books[1]?.id);
    assert.match(onlyMagia, /Autora: Ana/);
    assert.equal(onlyMagia.includes("A Espada"), false);
    const project = createProject("partilha", { notebooksSource: joined });
    const applied = applyNotebookToProject(project);
    assert.match(applied.entitiesSource, /ESPADA/);
    const bundle = buildPlayBundle(applied, null);
    assert.match(bundle.project.notebooksSource, /Autora: Maria/);
    assert.ok(parseShareHash(`#play=${encodePlayHash(bundle)}`)?.play);
    assert.equal(importCaderno("", ""), "");
    const caveExample = createExampleProject("goblin-cave");
    assert.equal(caveExample.notebooksSource, "");
  });

  it("caches by ###, treats peso as comment, and does not change specificity", () => {
    resetNotebookCache();
    const base = `### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  cause 5 de dano ao jogador.
### O Goblin
O goblin está na caverna.
Ele é covarde.
`;
    const first = compileNotebook(base);
    assert.ok(first.dirty.includes("A Espada"));
    assert.ok(first.dirty.includes("O Goblin"));
    const second = compileNotebook(base);
    assert.deepEqual(second.dirty, []);
    assert.equal(second.rulesSource, first.rulesSource);
    const touched = compileNotebook(base.replace("Ele é covarde.", "Ele é covarde.\nEle é um goblin."));
    assert.deepEqual(touched.dirty, ["O Goblin"]);
    assert.match(touched.entitiesSource, /ESPADA/);
    const withPeso = compileNotebook(`### A Espada
A espada está na caverna.
peso: sala
Quando o jogador pega a espada:
  cause 5 de dano ao jogador.
`);
    const withoutPeso = compileNotebook(`### A Espada
A espada está na caverna.
Quando o jogador pega a espada:
  cause 5 de dano ao jogador.
`);
    assert.equal(withPeso.rulesSource, withoutPeso.rulesSource);
    assert.equal(withPeso.issues.some((issue) => issue.message.includes("peso")), false);
    assert.equal(JSON.stringify(withPeso.extras).includes("peso"), false);
    assert.equal(withPeso.rulesSource.includes("weight"), false);
  });

  it("defaults notebooksSource to empty and keeps the cave equal", () => {
    const blank = createProject("caderno");
    assert.equal(blank.notebooksSource, "");
    const old = coerceProject({ entitiesSource: "JOGADOR.{ tags: agent; }\nstart()\n", rulesSource: "# start\nON: start\nnarrativa: \"ok\"\n" });
    assert.equal(old.notebooksSource, "");
    const cave = createExampleProject("goblin-cave");
    const before = cave.rulesSource;
    const compiled = compileProject(cave);
    assert.equal(compiled.errors.length, 0);
    assert.equal(cave.notebooksSource, "");
    assert.equal(cave.rulesSource, before);
    const booted = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    assert.match(booted.story, /./);
  });
});
