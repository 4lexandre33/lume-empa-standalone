import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../index.ts";
import type { NarrativeEngineService } from "../types.ts";
import { LIFE_MANIFEST, createLifePlugin } from "../../life/index.ts";
import { createGame, interactWith } from "./runtime.ts";
import { formatBeat } from "./beat.ts";
import { createExampleProject } from "./examples.ts";

describe("beat trace", () => {
  let core: Core;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(LIFE_MANIFEST, createLifePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-life");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("records intent rule candidates effects and vivo from the depth-1 beat", () => {
    const project = narrative.createProject("beat", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; }
ESPADA.{ tags: object; links: current_location=SALA; }
GOBLIN.{ tags: agent, vivo; links: current_location=SALA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# take gen
ON: *.object
DO: LIVE
narrativa: "pega"

# espada
ON: ESPADA
DO: KNOW x
    LIVE
narrativa: "maldita"

# goblin
ON: GOBLIN
narrativa: "grita"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = interactWith(game, "ESPADA");
    assert.equal(game.lastBeat.triggerId, "ESPADA");
    assert.equal(game.lastBeat.ruleId, "espada");
    assert.ok(game.lastBeat.candidates.some((c) => c.ruleId === "espada"));
    assert.ok(game.lastBeat.candidates.some((c) => c.ruleId === "take_gen"));
    const espada = game.lastBeat.candidates.find((c) => c.ruleId === "espada")!;
    const generic = game.lastBeat.candidates.find((c) => c.ruleId === "take_gen")!;
    assert.ok(espada.score > generic.score);
    assert.deepEqual(game.lastBeat.effects, ["KNOW", "LIVE"]);
    assert.equal(game.lastBeat.vivos[0]?.id, "GOBLIN");
    assert.equal(game.lastBeat.vivos[0]?.ruleId, "goblin");
    const text = formatBeat(game.lastBeat, "intent.action.interact.take.ESPADA");
    assert.match(text, /intent\.action\.interact\.take\.ESPADA/);
    assert.match(text, /regra: espada/);
    assert.match(text, /espada \(spec \d+\)/);
    assert.match(text, /efeitos: KNOW, LIVE/);
    assert.match(text, /vivo: GOBLIN → goblin/);
  });

  it("does not alter official examples", () => {
    const cave = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(cave);
    assert.equal(compiled.errors.length, 0);
    const game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    assert.equal(game.lastBeat.triggerId, "start");
  });
});
