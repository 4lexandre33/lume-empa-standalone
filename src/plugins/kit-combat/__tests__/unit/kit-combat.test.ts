import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { cloneWorldModel } from "../../../narrative-engine/lib/world-model.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { WORLD_EVENTS_MANIFEST, createWorldEventsPlugin } from "../../../world-events/index.ts";
import { KIT_COMBAT_MANIFEST, createKitCombatPlugin, KIT_MARK, COMBAT_TAGS } from "../../index.ts";
import type { CombatKitService } from "../../types.ts";

function attackHostile(game: ReturnType<typeof createGame>, targetId: string) {
  const world = cloneWorldModel(game.worldModel);
  const actor = world.get(game.playerEntityId);
  if (actor) actor.links.intent = "attack";
  return interactWith({ ...game, worldModel: world }, targetId);
}

describe("Combat kit", () => {
  let core: Core;
  let kit: CombatKitService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(WORLD_EVENTS_MANIFEST, createWorldEventsPlugin);
    core.registerPlugin(KIT_COMBAT_MANIFEST, createKitCombatPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-world-events");
    await core.activatePlugin("lume-kit-combat");
    kit = core.getService<CombatKitService>("CombatKit");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares CombatKit data capability and combat tags", () => {
    assert.equal(KIT_COMBAT_MANIFEST.name, "lume-kit-combat");
    assert.ok(kit.taxonomySource.includes(KIT_MARK));
    assert.ok(kit.taxonomySource.includes("weapon → object"));
    assert.ok(kit.taxonomySource.includes("hostile → agent"));
    assert.ok(kit.taxonomySource.includes("mortal → agent"));
    assert.deepEqual([...kit.tags], [...COMBAT_TAGS]);
    assert.equal(kit.rulesSource.includes(KIT_MARK), false);
  });

  it("applies once; attack subtracts force from hp; hp<=0 tags dead and EMITs morte", () => {
    let project = narrative.createProject("kit-combat-room", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: hp=10, force=2; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
GOBLIN.{ tags: agent, hostile, mortal; stats: hp=3, force=1, mood=0; links: current_location=SALA; name: Goblin; }
ESPADA.{ tags: weapon; name: Espada; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    project = kit.apply(project);
    project = kit.apply(project);
    assert.equal((project.taxonomySource.match(/# kit:combat/g) ?? []).length, 1);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    assert.ok(query("*.hostile", compiled.worldModel, "start", compiled.taxonomy).some(([id]) => id === "GOBLIN"));
    assert.ok(query("*.mortal", compiled.worldModel, "start", compiled.taxonomy).some(([id]) => id === "GOBLIN"));
    assert.ok(query("*.weapon", compiled.worldModel, "start", compiled.taxonomy).some(([id]) => id === "ESPADA"));
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));

    game = attackHostile(game, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.stats.hp, 1);
    assert.equal(game.worldModel.get("GOBLIN")?.stats.mood, -1);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("dead"), false);
    assert.ok(game.story.includes("golpe"));

    game = attackHostile(game, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.stats.hp, -1);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("dead"), false);

    game = interactWith(game, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("dead"), true);
    assert.ok(game.worldModel.get("morte")?.tags.has("event"));
    assert.ok(game.story.includes("cai") || game.history.some((b) => /cai/.test(b.story)));
  });

  it("without hp or hostile does not mutate", () => {
    let project = narrative.createProject("kit-combat-mute", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: force=1; }
CIVIL.{ tags: agent; stats: hp=4; name: Civil; }
FANTASMA.{ tags: hostile; name: Fantasma; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    project = kit.apply(project);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = attackHostile(game, "CIVIL");
    assert.equal(game.worldModel.get("CIVIL")?.stats.hp, 4);
    game = attackHostile(game, "FANTASMA");
    assert.equal(game.worldModel.get("FANTASMA")?.stats.hp, undefined);
  });

  it("author attack still wins", () => {
    let project = narrative.createProject("kit-combat-author", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: force=1; }
CHEFE.{ tags: agent, hostile, mortal; stats: hp=5; name: Chefe; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# chefe
ON: CHEFE
IF: JOGADOR.intent=attack
narrativa: "O chefe bloqueia."
`,
    });
    project = kit.apply(project);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = attackHostile(game, "CHEFE");
    assert.equal(game.worldModel.get("CHEFE")?.stats.hp, 5);
    assert.ok(game.story.includes("bloqueia"));
  });

  it("keeps author taxonomy children and still marks the kit", () => {
    let project = narrative.createProject("kit-combat-merge", {
      entitiesSource: `JOGADOR.{ tags: agent; }
start()
`,
      taxonomySource: "weapon → object\ncustom → object\n",
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    project = kit.apply(project);
    assert.equal((project.taxonomySource.match(/^weapon\s*→/gm) ?? []).length, 1);
    assert.ok(project.taxonomySource.includes("hostile"));
    assert.ok(project.taxonomySource.includes("custom"));
    assert.ok(kit.applied(project));
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
  });

  it("does not alter official examples", () => {
    const cave = createExampleProject("goblin-cave");
    assert.equal(kit.applied(cave), false);
    const compiled = narrative.compileProject(cave);
    assert.equal(compiled.errors.length, 0);
  });
});
