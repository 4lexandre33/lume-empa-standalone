import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { PROCESS_MANIFEST, createProcessPlugin, PROCESS_TAG } from "../../index.ts";
import type { ProcessService } from "../../types.ts";

describe("Process", () => {
  let core: Core;
  let narrative: NarrativeEngineService;
  let process: ProcessService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(PROCESS_MANIFEST, createProcessPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-process");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    process = core.getService<ProcessService>("Process");
  });

  it("declares Process and requires RuleEffects", () => {
    assert.equal(PROCESS_MANIFEST.name, "lume-process");
    assert.ok(PROCESS_MANIFEST.capabilities?.provides?.some((c) => c.name === "Process"));
    assert.ok(PROCESS_MANIFEST.requires?.mandatory?.some((c) => c.name === "RuleEffects"));
    assert.equal(process.tag, PROCESS_TAG);
  });

  it("WAIT schedules a process entity and does not fire it yet", () => {
    const project = narrative.createProject("espera", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# arma
ON: PORTA
DO: WAIT 3.FUSE
narrativa: "espera"

# fuse
ON: FUSE
DO: PORTA.aberta
    DESTROY FUSE
narrativa: "abre"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "PORTA");
    assert.equal(process.isProcess(game.worldModel, "FUSE"), true);
    assert.equal(process.remaining(game.worldModel, "FUSE"), 3);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), false);
    assert.deepEqual(process.list(game.worldModel), ["FUSE"]);
    assert.deepEqual(process.due(game.worldModel), []);
  });

  it("TICK decrements and fires ON when remaining hits 0", () => {
    const project = narrative.createProject("tick", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# arma
ON: PORTA
DO: WAIT 2.FUSE
narrativa: "espera"

# passa
ON: JOGADOR
DO: TICK
narrativa: "passa"

# fuse
ON: FUSE
DO: PORTA.aberta
    DESTROY FUSE
narrativa: "abre"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR"));
    game = narrative.interact(game, "PORTA");
    game = narrative.interact(game, "JOGADOR");
    assert.equal(process.remaining(game.worldModel, "FUSE"), 1);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), false);
    game = narrative.interact(game, "JOGADOR");
    assert.equal(game.worldModel.has("FUSE"), false);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), true);
    assert.ok(game.history.some((beat) => beat.triggerId === "FUSE"));
    assert.match(game.history.find((beat) => beat.triggerId === "FUSE")!.story, /abre/);
  });

  it("remaining 0 is a daemon until DESTROY", () => {
    const project = narrative.createProject("chuva", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: wet=0; links: ; }
CEU.{ tags: abstract; stats: ; links: ; }
SOL.{ tags: abstract; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# comeca
ON: JOGADOR
IF: JOGADOR.wet=0
DO: WAIT 0.CHUVA
    JOGADOR.wet=1
narrativa: "nubla"

# chuva
ON: CHUVA
DO: JOGADOR.wet+1
narrativa: "chove"

# passa
ON: CEU
DO: TICK
narrativa: "passa"

# para
ON: SOL
DO: DESTROY CHUVA
narrativa: "seca"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR"));
    game = narrative.interact(game, "JOGADOR");
    assert.equal(process.remaining(game.worldModel, "CHUVA"), 0);
    assert.equal(game.worldModel.get("JOGADOR")?.stats.wet, 1);
    game = narrative.interact(game, "CEU");
    assert.equal(game.worldModel.get("JOGADOR")?.stats.wet, 2);
    game = narrative.interact(game, "CEU");
    assert.equal(game.worldModel.get("JOGADOR")?.stats.wet, 3);
    game = narrative.interact(game, "SOL");
    assert.equal(game.worldModel.has("CHUVA"), false);
    const wet = game.worldModel.get("JOGADOR")?.stats.wet;
    game = narrative.interact(game, "CEU");
    assert.equal(game.worldModel.get("JOGADOR")?.stats.wet, wet);
  });

  it("rewinds WAIT because remaining lives in the world", () => {
    const project = narrative.createProject("rewind", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# arma
ON: PORTA
DO: WAIT 3.FUSE
narrativa: "espera"

# passa
ON: JOGADOR
DO: TICK
narrativa: "passa"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR"));
    game = narrative.interact(game, "PORTA");
    const afterWait = game.history.length - 1;
    game = narrative.interact(game, "JOGADOR");
    game = narrative.interact(game, "JOGADOR");
    assert.equal(process.remaining(game.worldModel, "FUSE"), 1);
    game = narrative.rewindTo(game, afterWait);
    assert.equal(process.remaining(game.worldModel, "FUSE"), 3);
  });

  it("dry-run lists WAIT and TICK without scheduling", () => {
    const project = narrative.createProject("seco", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
JOGADOR.{ tags: agent; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# arma
ON: PORTA
DO: WAIT 2.FUSE
narrativa: "espera"

# passa
ON: JOGADOR
DO: TICK
narrativa: "passa"
`,
    });
    const compiled = narrative.compileProject(project);
    const game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR"));
    const report = narrative.dryRun(game, "PORTA");
    assert.deepEqual(
      report.effects.map((effect) => effect.verb),
      ["wait"],
    );
    assert.equal(game.worldModel.has("FUSE"), false);
    assert.equal(report.wouldMutate, false);
    const tickReport = narrative.dryRun(game, "JOGADOR");
    assert.deepEqual(
      tickReport.effects.map((effect) => effect.verb),
      ["tick"],
    );
  });

  it("does not change goblin-cave play", () => {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    game = narrative.interact(game, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), false);
    assert.equal(game.worldModel.get("JOGADOR")?.stats.fear, 9);
  });
});
