import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../../intent-engine/index.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { executeIntent, type QueryFn } from "../../../intent-engine/lib/index.ts";
import { KIT_ADVENTURE_MANIFEST, createKitAdventurePlugin, KIT_MARK } from "../../index.ts";
import type { AdventureKitService } from "../../types.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

describe("Adventure kit", () => {
  let core: Core;
  let kit: AdventureKitService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    core.registerPlugin(KIT_ADVENTURE_MANIFEST, createKitAdventurePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    await core.activatePlugin("lume-kit-adventure");
    kit = core.getService<AdventureKitService>("AdventureKit");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares AdventureKit data capability", () => {
    assert.equal(KIT_ADVENTURE_MANIFEST.name, "lume-kit-adventure");
    assert.ok(kit.taxonomySource.includes(KIT_MARK));
    assert.ok(kit.rulesSource.includes("intent=take"));
    assert.equal(kit.rulesSource.includes(KIT_MARK), false);
  });

  it("applies once and compiles a box room", () => {
    let project = narrative.createProject("kit-room", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
CORREDOR.{ tags: place; name: Corredor; }
ESPADA.{ tags: portable; links: current_location=SALA; name: Espada; }
MESA.{ tags: fixture; links: current_location=SALA; name: Mesa; }
CAIXA.{ tags: container, openable, lockable; links: current_location=SALA; name: Caixa; }
PORTA_SANGRENTA.{ tags: openable; links: current_location=SALA; name: Porta; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# porta
ON: PORTA_SANGRENTA
IF: JOGADOR.intent=open
narrativa: "Sangue sela a porta."
`,
    });
    project = kit.apply(project);
    project = kit.apply(project);
    assert.equal((project.taxonomySource.match(/# kit:adventure/g) ?? []).length, 1);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));

    const run = (cmd: string) => {
      const result = executeIntent(cmd, game, q, interactWith);
      assert.equal(result.executed, true, cmd);
      game = result.game;
      return result;
    };

    run("intent.action.interact.take.ESPADA");
    assert.equal(game.worldModel.get("ESPADA")?.links.current_location, "JOGADOR");

    run("intent.action.interact.drop.ESPADA");
    assert.equal(game.worldModel.get("ESPADA")?.links.current_location, "SALA");

    run("intent.action.interact.take.MESA");
    assert.equal(game.worldModel.get("MESA")?.links.current_location, "SALA");
    assert.ok(game.story.includes("não sai"));

    run("intent.action.interact.take.ESPADA");
    run("intent.action.interact.put.ESPADA.CAIXA");
    assert.equal(game.worldModel.get("ESPADA")?.links.current_location, "JOGADOR");
    assert.ok(game.story.includes("fechado"));
    run("intent.action.interact.open.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("aberta"), true);
    run("intent.action.interact.lock.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("locked"), false);
    assert.ok(game.story.includes("Fecha"));
    run("intent.action.interact.put.ESPADA.CAIXA");
    assert.equal(game.worldModel.get("ESPADA")?.links.current_location, "CAIXA");

    run("intent.action.interact.close.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("aberta"), false);
    run("intent.action.interact.lock.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("locked"), true);
    run("intent.action.interact.open.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("aberta"), false);
    run("intent.action.interact.unlock.CAIXA");
    assert.equal(game.worldModel.get("CAIXA")?.tags.has("locked"), false);

    const door = executeIntent("intent.action.interact.open.PORTA_SANGRENTA", game, q, interactWith);
    assert.equal(door.executed, true);
    assert.ok(door.game.story.includes("Sangue"));
    assert.equal(door.game.worldModel.get("PORTA_SANGRENTA")?.tags.has("aberta"), false);
    game = door.game;

    run("intent.action.go.CORREDOR");
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, "CORREDOR");
    run("intent.action.look");
    assert.ok(game.story.includes("Corredor"));
    run("intent.action.inventory");
    assert.ok(game.story.includes("carrega"));
  });

  it("keeps author taxonomy children and still marks the kit", () => {
    let project = narrative.createProject("kit-merge", {
      entitiesSource: `JOGADOR.{ tags: agent; }
start()
`,
      taxonomySource: "portable → object\ncustom → object\n",
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    project = kit.apply(project);
    assert.equal((project.taxonomySource.match(/^portable\s*→/gm) ?? []).length, 1);
    assert.ok(project.taxonomySource.includes("fixture"));
    assert.ok(project.taxonomySource.includes("custom"));
    assert.ok(kit.applied(project));
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
  });

  it("conversation fallbacks yield to a more specific author rule", () => {
    let project = narrative.createProject("kit-talk", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
GUARDA.{ tags: agent; links: current_location=SALA; name: Guarda; }
CHEFE.{ tags: agent, falando; links: current_location=SALA; name: Chefe; }
SEGREDO.{ tags: topic; name: chave; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# pergunta específica
ON: GUARDA
IF: JOGADOR.intent=ask
IF: JOGADOR.intent_topic=SEGREDO
narrativa: "Cala-te."
`,
    });
    project = kit.apply(project);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));

    const run = (cmd: string) => {
      const result = executeIntent(cmd, game, q, interactWith);
      assert.equal(result.executed, true, cmd);
      game = result.game;
      return result;
    };

    run("intent.action.interact.talk.GUARDA");
    assert.ok(game.story.includes("nada a dizer"));

    run("intent.action.communicate.GUARDA");
    assert.ok(game.story.includes("nada a dizer"));

    run("intent.action.interact.ask.GUARDA.SEGREDO");
    assert.ok(game.story.includes("Cala-te"));

    run("intent.action.interact.tell.CHEFE.SEGREDO");
    assert.ok(game.story.includes("silêncio"));

    run("intent.action.interact.bye.GUARDA");
    assert.ok(game.story.includes("Não estavam"));
    run("intent.action.interact.bye.CHEFE");
    assert.ok(game.story.includes("termina"));
    assert.equal(game.worldModel.get("CHEFE")?.tags.has("falando"), false);
  });

  it("does not alter official examples", () => {
    const cave = createExampleProject("goblin-cave");
    assert.equal(kit.applied(cave), false);
    const compiled = narrative.compileProject(cave);
    assert.equal(compiled.errors.length, 0);
  });
});
