import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { WORLD_EVENTS_MANIFEST, createWorldEventsPlugin } from "../../../world-events/index.ts";
import { CHAIN_MANIFEST, createChainPlugin } from "../../index.ts";
import type { ChainService } from "../../types.ts";

describe("Chain", () => {
  let core: Core;
  let narrative: NarrativeEngineService;
  let chain: ChainService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(WORLD_EVENTS_MANIFEST, createWorldEventsPlugin);
    core.registerPlugin(CHAIN_MANIFEST, createChainPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-world-events");
    await core.activatePlugin("lume-chain");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    chain = core.getService<ChainService>("Chain");
  });

  it("declares Chain and requires RuleEffects", () => {
    assert.equal(CHAIN_MANIFEST.name, "lume-chain");
    assert.ok(CHAIN_MANIFEST.capabilities?.provides?.some((c) => c.name === "Chain"));
    assert.ok(CHAIN_MANIFEST.requires?.mandatory?.some((c) => c.name === "RuleEffects"));
    assert.ok(chain.follow);
  });

  it("THEN interacts an existing entity without tagging it event", () => {
    const project = narrative.createProject("then", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
CORREDOR.{ tags: place; stats: ; links: ; name: Corredor; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    THEN CORREDOR
narrativa: "abre"

# olhar
ON: CORREDOR
narrativa: "O corredor continua."
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "PORTA");
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), true);
    assert.equal(game.worldModel.get("CORREDOR")?.tags.has("event"), false);
    assert.ok(game.history.some((beat) => beat.triggerId === "PORTA"));
    assert.ok(game.history.some((beat) => beat.triggerId === "CORREDOR"));
    assert.match(game.history.find((beat) => beat.triggerId === "CORREDOR")!.story, /corredor/);
  });

  it("THEN $ reuses the trigger and does not spawn", () => {
    const project = narrative.createProject("dollar", {
      entitiesSource: `SINO.{ tags: object; stats: toques=0; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# primeiro
ON: SINO
IF: SINO.toques=0
DO: SINO.toques=1
    THEN $
narrativa: "toca"

# eco
ON: SINO
IF: SINO.toques=1
DO: SINO.toques=2
narrativa: "eco"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "SINO");
    assert.equal(game.worldModel.get("SINO")?.stats.toques, 2);
    assert.equal(game.worldModel.has("SINO"), true);
    assert.ok(game.history.filter((beat) => beat.triggerId === "SINO").length >= 2);
  });

  it("THEN is not EMIT: no event entity appears", () => {
    const project = narrative.createProject("nao-evento", {
      entitiesSource: `BOTAO.{ tags: object; stats: ; links: ; }
ALARME.{ tags: object; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# aperta
ON: BOTAO
DO: THEN ALARME
narrativa: "clica"

# soa
ON: ALARME
narrativa: "soa"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "BOTAO");
    assert.equal(game.worldModel.get("ALARME")?.tags.has("event"), false);
    assert.ok(game.history.some((beat) => beat.triggerId === "ALARME"));
  });

  it("caps recursive THEN with the same depth as EMIT", () => {
    const project = narrative.createProject("loop", {
      entitiesSource: `X.{ tags: object; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# loop
ON: X
DO: THEN X
narrativa: "x"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "X");
    assert.ok(game.history.filter((beat) => beat.triggerId === "X").length <= 5);
  });

  it("dry-run lists THEN without following", () => {
    const project = narrative.createProject("seco", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }
CORREDOR.{ tags: place; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
DO: PORTA.aberta
    THEN CORREDOR
narrativa: "abre"
`,
    });
    const compiled = narrative.compileProject(project);
    const game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    const report = narrative.dryRun(game, "PORTA");
    assert.deepEqual(
      report.effects.map((effect) => effect.verb),
      ["then"],
    );
    assert.equal(game.history.some((beat) => beat.triggerId === "CORREDOR"), false);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("aberta"), false);
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
