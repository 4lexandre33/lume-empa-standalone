import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../../intent-engine/index.ts";
import { AGENCY_MANIFEST, createAgencyPlugin } from "../../index.ts";
import { commandFromEffectArgs } from "../../lib/command.ts";
import type { AgencyService } from "../../types.ts";

describe("Agency", () => {
  it("maps INTENT args onto catalog commands", () => {
    assert.deepEqual(commandFromEffectArgs(["GOBLIN", "attack", "JOGADOR"]), {
      actor: "GOBLIN",
      command: "intent.action.interact.attack.JOGADOR",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "move", "CAVERNA"]), {
      actor: "JOGADOR",
      command: "intent.action.move.CAVERNA",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "observe", "local"]), {
      actor: "JOGADOR",
      command: "intent.perceive.observe.local",
    });
    assert.deepEqual(commandFromEffectArgs(["GOBLIN", "intent", "action", "wait"]), {
      actor: "GOBLIN",
      command: "intent.action.wait",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "go", "SALA"]), {
      actor: "JOGADOR",
      command: "intent.action.go.SALA",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "look"]), {
      actor: "JOGADOR",
      command: "intent.action.look",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "inventory"]), {
      actor: "JOGADOR",
      command: "intent.action.inventory",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "drop", "ESPADA"]), {
      actor: "JOGADOR",
      command: "intent.action.interact.drop.ESPADA",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "put", "ESPADA", "CAIXA"]), {
      actor: "JOGADOR",
      command: "intent.action.interact.put.ESPADA.CAIXA",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "ask", "GOBLIN", "CHAVE"]), {
      actor: "JOGADOR",
      command: "intent.action.interact.ask.GOBLIN.CHAVE",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "tell", "GOBLIN", "CHAVE"]), {
      actor: "JOGADOR",
      command: "intent.action.interact.tell.GOBLIN.CHAVE",
    });
    assert.deepEqual(commandFromEffectArgs(["JOGADOR", "bye", "GOBLIN"]), {
      actor: "JOGADOR",
      command: "intent.action.interact.bye.GOBLIN",
    });
  });

  let core: Core;
  let narrative: NarrativeEngineService;
  let agency: AgencyService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    core.registerPlugin(AGENCY_MANIFEST, createAgencyPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    await core.activatePlugin("lume-agency");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    agency = core.getService<AgencyService>("Agency");
  });

  it("INTENT in DO dispatches through IntentEngine with source script", () => {
    const project = narrative.createProject("agency", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: ; links: current_location=SALA; }
SALA.{ tags: place; stats: ; links: ; }
CAVERNA.{ tags: place; stats: ; links: ; }
SINAL.{ tags: event; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# mover
ON: *.place
DO: JOGADOR.current_location=$
narrativa: "foi a {$.name}"

# sinal
ON: SINAL
DO: INTENT JOGADOR.move.CAVERNA
narrativa: "sinal"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
    game = narrative.interact(game, "SINAL");
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, "CAVERNA");
    assert.equal(game.worldModel.get("JOGADOR")?.links.intent, undefined);
    const mapped = agency.commandFromEffect(["JOGADOR", "move", "CAVERNA"]);
    assert.equal(mapped?.command, "intent.action.move.CAVERNA");
  });

  it("does not execute an invalid intent from a rule", () => {
    const project = narrative.createProject("fail", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: ; links: current_location=SALA; }
SALA.{ tags: place; stats: ; links: ; }
GOBLIN.{ tags: agent; stats: ; links: current_location=CAVERNA; }
CAVERNA.{ tags: place; stats: ; links: ; }
SINAL.{ tags: event; stats: ; links: ; }
start()
`,
      taxonomySource: "goblin → monster\nmonster → agent\n",
      rulesSource: `# start
ON: start
narrativa: "ok"

# sinal
ON: SINAL
DO: INTENT JOGADOR.attack.GOBLIN
narrativa: "tenta"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
    const loc = game.worldModel.get("JOGADOR")!.links.current_location;
    game = narrative.interact(game, "SINAL");
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, loc);
    assert.equal(game.worldModel.get("GOBLIN")?.links.current_location, "CAVERNA");
  });
});
