import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { SPATIAL_MANIFEST, createSpatialPlugin } from "../../../spatial/index.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../../intent-engine/index.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import { createGame } from "../../../narrative-engine/lib/runtime.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { resolveIntent, suggestIntent, executeIntent, type QueryFn } from "../../../intent-engine/lib/index.ts";
import { interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { SENSES_MANIFEST, createSensesPlugin } from "../../index.ts";
import type { SenseEntity, SensesService } from "../../types.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

function entity(id: string, links: Record<string, string>, tags: string[] = [], stats: Record<string, number> = {}): SenseEntity {
  return { id, links, tags, stats };
}

describe("Senses", () => {
  let core: Core;
  let senses: SensesService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    core.registerPlugin(SPATIAL_MANIFEST, createSpatialPlugin);
    core.registerPlugin(SENSES_MANIFEST, createSensesPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    await core.activatePlugin("lume-spatial");
    await core.activatePlugin("lume-senses");
    senses = core.getService<SensesService>("Senses");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares Senses capability", () => {
    assert.equal(SENSES_MANIFEST.name, "lume-senses");
    assert.ok(SENSES_MANIFEST.capabilities?.provides?.some((c) => c.name === "Senses"));
  });

  it("hides contents of a closed container from sight and touch, not hearing", () => {
    const world = new Map<string, SenseEntity>([
      ["SALA", entity("SALA", {}, ["place"])],
      ["CAIXA", entity("CAIXA", { in: "SALA" }, ["object", "container"])],
      ["CHAVE", entity("CHAVE", { in: "CAIXA" }, ["object"])],
      ["JOGADOR", entity("JOGADOR", { current_location: "SALA" }, ["agent"])],
    ]);
    assert.equal(senses.canSee(world, "JOGADOR", "CAIXA"), true);
    assert.equal(senses.canSee(world, "JOGADOR", "CHAVE"), false);
    assert.equal(senses.canTouch(world, "JOGADOR", "CHAVE"), false);
    assert.equal(senses.canHear(world, "JOGADOR", "CHAVE"), true);
    assert.equal(world.get("CHAVE")?.links.in, "CAIXA");
  });

  it("reveals contents when the container is aberta", () => {
    const world = new Map<string, SenseEntity>([
      ["SALA", entity("SALA", {}, ["place"])],
      ["CAIXA", entity("CAIXA", { in: "SALA" }, ["object", "container", "aberta"])],
      ["CHAVE", entity("CHAVE", { in: "CAIXA" }, ["object"])],
      ["JOGADOR", entity("JOGADOR", { current_location: "SALA" }, ["agent"])],
    ]);
    assert.equal(senses.canSee(world, "JOGADOR", "CHAVE"), true);
    assert.equal(senses.canTouch(world, "JOGADOR", "CHAVE"), true);
  });

  it("does not light a dark room from a lantern inside a closed box", () => {
    const world = new Map<string, SenseEntity>([
      ["SALA", entity("SALA", {}, ["place", "dark"])],
      ["CAIXA", entity("CAIXA", { in: "SALA" }, ["object", "container"])],
      ["LANTERNA", entity("LANTERNA", { in: "CAIXA" }, ["object", "lit"], { illumination: 8 })],
      ["JOGADOR", entity("JOGADOR", { current_location: "SALA" }, ["agent"])],
    ]);
    assert.equal(senses.scope(world, "JOGADOR").lit, false);
    assert.equal(senses.canSee(world, "JOGADOR", "CAIXA"), false);
    assert.equal(senses.canSee(world, "JOGADOR", "LANTERNA"), false);
    assert.equal(senses.canTouch(world, "JOGADOR", "CAIXA"), true);
  });

  it("lights a dark room when the lantern is held", () => {
    const world = new Map<string, SenseEntity>([
      ["SALA", entity("SALA", {}, ["place", "dark"])],
      ["CAIXA", entity("CAIXA", { in: "SALA" }, ["object", "container"])],
      ["LANTERNA", entity("LANTERNA", { held_by: "JOGADOR" }, ["object", "lit"], { illumination: 8 })],
      ["JOGADOR", entity("JOGADOR", { current_location: "SALA" }, ["agent"])],
    ]);
    assert.equal(senses.scope(world, "JOGADOR").lit, true);
    assert.equal(senses.canSee(world, "JOGADOR", "CAIXA"), true);
    assert.equal(senses.canSee(world, "JOGADOR", "LANTERNA"), true);
    assert.equal(senses.visibleTo(world, "JOGADOR").includes("JOGADOR"), false);
  });

  it("does not write can_see links", () => {
    const world = new Map<string, SenseEntity>([
      ["SALA", entity("SALA", {}, ["place"])],
      ["JOGADOR", entity("JOGADOR", { current_location: "SALA" }, ["agent"])],
    ]);
    senses.scope(world, "JOGADOR");
    senses.visibleTo(world, "JOGADOR");
    assert.equal(world.get("JOGADOR")?.links.can_see, undefined);
    assert.equal(world.get("SALA")?.links.can_see, undefined);
  });

  it("filters take/observe by scope and still lists the cave torch", () => {
    const compiled = narrative.compileProject(createExampleProject("goblin-cave"));
    assert.equal(compiled.errors.length, 0);
    const game = createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy);
    const scope = (world: typeof game.worldModel, observer: string) => senses.scope(world, observer);
    assert.deepEqual(suggestIntent("intent.action.interact.take.", game, q, { scope }).map((s) => s.token), ["TOCHA"]);
    assert.equal(resolveIntent("intent.action.interact.take.TOCHA", game, q, { scope }).status, "VALID");

    const box = narrative.compileProject(
      narrative.createProject("caixa-opaca", {
        entitiesSource: `SALA.{ tags: place; links: ; }
CAIXA.{ tags: object, container; links: in=SALA; }
CHAVE.{ tags: object; links: in=CAIXA; }
JOGADOR.{ tags: agent; links: current_location=SALA; }
start()
`,
        taxonomySource: "",
        rulesSource: `# start
ON: start
narrativa: "ok"

ON: *.object
IF: JOGADOR.intent=take
DO: $.current_location=JOGADOR
narrativa: "pega"
`,
      }),
    );
    assert.equal(box.errors.length, 0);
    const boxed = createGame(box.worldModel, box.rules, "JOGADOR", box.taxonomy);
    const boxedScope = (world: typeof boxed.worldModel, observer: string) => senses.scope(world, observer);
    const take = suggestIntent("intent.action.interact.take.", boxed, q, { scope: boxedScope }).map((s) => s.token);
    assert.ok(take.includes("CAIXA"));
    assert.ok(!take.includes("CHAVE"));
    assert.equal(resolveIntent("intent.action.interact.take.CHAVE", boxed, q, { scope: boxedScope }).status, "TARGET_UNAVAILABLE");
    const look = executeIntent("intent.perceive.observe.local", boxed, q, interactWith, { scope: boxedScope });
    assert.equal(look.executed, true);
    assert.equal(look.game.story.includes("CHAVE"), false);
    assert.equal(look.game.worldModel.get("CHAVE")?.links.in, "CAIXA");
  });
});
