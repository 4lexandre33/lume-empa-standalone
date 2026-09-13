import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { LIFE_MANIFEST, createLifePlugin, MAX_LIVE_PER_BEAT, VIVO_TAG } from "../../index.ts";
import type { LifeService } from "../../types.ts";

describe("Life", () => {
  let core: Core;
  let narrative: NarrativeEngineService;
  let life: LifeService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(LIFE_MANIFEST, createLifePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-life");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    life = core.getService<LifeService>("Life");
  });

  it("declares Life and requires RuleEffects", () => {
    assert.equal(LIFE_MANIFEST.name, "lume-life");
    assert.ok(LIFE_MANIFEST.capabilities?.provides?.some((c) => c.name === "Life"));
    assert.ok(LIFE_MANIFEST.requires?.mandatory?.some((c) => c.name === "RuleEffects"));
    assert.equal(life.tag, VIVO_TAG);
    assert.equal(life.maxPerBeat, MAX_LIVE_PER_BEAT);
    assert.ok(life.live);
  });

  it("LIVE id interacts an existing entity without tagging it event", () => {
    const project = narrative.createProject("live-id", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: in=CAVERNA; }
GOBLIN.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
CAVERNA.{ tags: place; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: in=CAVERNA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    LIVE GOBLIN
narrativa: "abre"

# reage
ON: GOBLIN
DO: GOBLIN.alerta
narrativa: "O goblin reage."
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = narrative.interact(game, "PORTA");
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), true);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), true);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("event"), false);
    assert.ok(game.history.some((beat) => beat.triggerId === "PORTA"));
    assert.ok(game.history.some((beat) => beat.triggerId === "GOBLIN"));
    assert.match(game.history.find((beat) => beat.triggerId === "GOBLIN")!.story, /goblin/);
  });

  it("LIVE without args scans vivo here, not the player or trigger", () => {
    const project = narrative.createProject("live-scan", {
      entitiesSource: `CAVERNA.{ tags: place; stats: ; links: ; }
JOGADOR.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
PORTA.{ tags: object, vivo; stats: ; links: in=CAVERNA; }
GOBLIN.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
LONGE.{ tags: agent, vivo; stats: ; links: in=FLORESTA; }
FLORESTA.{ tags: place; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    LIVE
narrativa: "abre"

# reage
ON: GOBLIN
DO: GOBLIN.alerta
narrativa: "reage"

# porta viva
ON: PORTA
IF: PORTA.alerta
DO: PORTA.eco
narrativa: "eco"

# jogador
ON: JOGADOR
DO: JOGADOR.eco
narrativa: "eu"

# longe
ON: LONGE
DO: LONGE.alerta
narrativa: "longe"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = narrative.interact(game, "PORTA");
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), true);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), true);
    assert.equal(game.worldModel.get("JOGADOR")?.tags.has("eco"), false);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("eco"), false);
    assert.equal(game.worldModel.get("LONGE")?.tags.has("alerta"), false);
  });

  it("scans vivos in id order and keeps the prefix under the cap", () => {
    const project = narrative.createProject("live-ordem", {
      entitiesSource: `CAVERNA.{ tags: place; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: in=CAVERNA; }
PORTA.{ tags: object; stats: ; links: in=CAVERNA; }
A.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
B.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
C.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
D.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
E.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: LIVE
narrativa: "abre"

# a
ON: A
DO: A.reagiu
narrativa: "a"

# b
ON: B
DO: B.reagiu
narrativa: "b"

# c
ON: C
DO: C.reagiu
narrativa: "c"

# d
ON: D
DO: D.reagiu
narrativa: "d"

# e
ON: E
DO: E.reagiu
narrativa: "e"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = narrative.interact(game, "PORTA");
    const reacted = ["A", "B", "C", "D", "E"].filter((id) => game.worldModel.get(id)?.tags.has("reagiu"));
    assert.deepEqual(reacted, ["A", "B", "C", "D"]);
    const liveBeats = game.history.filter((beat) => ["A", "B", "C", "D", "E"].includes(beat.triggerId)).map((beat) => beat.triggerId);
    assert.deepEqual(liveBeats, ["A", "B", "C", "D"]);
  });

  it("LIVE without vivo nearby does nothing extra", () => {
    const project = narrative.createProject("live-vazio", {
      entitiesSource: `CAVERNA.{ tags: place; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: in=CAVERNA; }
PORTA.{ tags: object; stats: ; links: in=CAVERNA; }
GOBLIN.{ tags: agent; stats: ; links: in=CAVERNA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    LIVE
narrativa: "abre"

# reage
ON: GOBLIN
DO: GOBLIN.alerta
narrativa: "reage"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = narrative.interact(game, "PORTA");
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), true);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), false);
    assert.equal(game.history.some((beat) => beat.triggerId === "GOBLIN"), false);
  });

  it("caps recursive LIVE with the same depth as EMIT", () => {
    const project = narrative.createProject("loop", {
      entitiesSource: `X.{ tags: object; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# loop
ON: X
DO: LIVE X
narrativa: "x"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "X");
    assert.ok(game.history.filter((beat) => beat.triggerId === "X").length <= 5);
  });

  it("dry-run lists LIVE without following", () => {
    const project = narrative.createProject("seco", {
      entitiesSource: `CAVERNA.{ tags: place; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: in=CAVERNA; }
PORTA.{ tags: object; stats: ; links: in=CAVERNA; }
GOBLIN.{ tags: agent, vivo; stats: ; links: in=CAVERNA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    LIVE
narrativa: "abre"

# reage
ON: GOBLIN
DO: GOBLIN.alerta
narrativa: "reage"
`,
    });
    const compiled = narrative.compileProject(project);
    const game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    const report = narrative.dryRun(game, "PORTA");
    assert.deepEqual(
      report.effects.map((effect) => effect.verb),
      ["live"],
    );
    assert.equal(game.history.some((beat) => beat.triggerId === "GOBLIN"), false);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), false);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("alerta"), false);
  });

  it("does not change goblin-cave play", () => {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
    game = narrative.interact(game, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), false);
  });
});
