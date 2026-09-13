import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../../intent-engine/index.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { cloneWorldModel } from "../../../narrative-engine/lib/world-model.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { executeIntent, type QueryFn } from "../../../intent-engine/lib/index.ts";
import { KIT_SOCIAL_MANIFEST, createKitSocialPlugin, KIT_MARK, RELATION_CATEGORIES } from "../../index.ts";
import type { SocialKitService } from "../../types.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

function attackAgent(game: ReturnType<typeof createGame>, targetId: string) {
  const world = cloneWorldModel(game.worldModel);
  const actor = world.get(game.playerEntityId);
  if (actor) actor.links.intent = "attack";
  return interactWith({ ...game, worldModel: world }, targetId);
}

describe("Social kit", () => {
  let core: Core;
  let kit: SocialKitService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    core.registerPlugin(KIT_SOCIAL_MANIFEST, createKitSocialPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    await core.activatePlugin("lume-kit-social");
    kit = core.getService<SocialKitService>("SocialKit");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares SocialKit data capability and TDRS categories", () => {
    assert.equal(KIT_SOCIAL_MANIFEST.name, "lume-kit-social");
    assert.ok(kit.taxonomySource.includes(KIT_MARK));
    assert.ok(kit.taxonomySource.includes("relation → information"));
    assert.ok(kit.taxonomySource.includes("memory → information"));
    assert.deepEqual([...kit.categories], [...RELATION_CATEGORIES]);
    assert.ok(kit.categories.includes("acquaintance"));
    assert.ok(kit.categories.includes("friend"));
    assert.ok(kit.categories.includes("enemy"));
    assert.equal(kit.rulesSource.includes(KIT_MARK), false);
  });

  it("applies once; talk raises mood and affinity; tell raises affinity; attack lowers mood", () => {
    let project = narrative.createProject("kit-social-room", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
GUARDA.{ tags: agent; stats: mood=1; links: current_location=SALA, rel=REL_JOGADOR_GUARDA; name: Guarda; }
REL_JOGADOR_GUARDA.{ tags: relation, acquaintance; stats: affinity=40; links: from=JOGADOR, to=GUARDA; }
LORE.{ tags: memory, topic; name: rumor; }
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
    assert.equal((project.taxonomySource.match(/# kit:social/g) ?? []).length, 1);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    assert.ok(query("*.relation", compiled.worldModel, "start", compiled.taxonomy).some(([id]) => id === "REL_JOGADOR_GUARDA"));
    assert.ok(query("*.memory", compiled.worldModel, "start", compiled.taxonomy).some(([id]) => id === "LORE"));
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));

    const run = (cmd: string) => {
      const result = executeIntent(cmd, game, q, interactWith);
      assert.equal(result.executed, true, cmd);
      game = result.game;
      return result;
    };

    run("intent.action.interact.talk.GUARDA");
    assert.equal(game.worldModel.get("GUARDA")?.stats.mood, 2);
    assert.equal(game.worldModel.get("REL_JOGADOR_GUARDA")?.stats.affinity, 41);
    assert.ok(game.story.includes("aquece"));

    run("intent.action.interact.tell.GUARDA.LORE");
    assert.equal(game.worldModel.get("GUARDA")?.stats.mood, 2);
    assert.equal(game.worldModel.get("REL_JOGADOR_GUARDA")?.stats.affinity, 42);
    assert.ok(game.story.includes("guarda o que ouviu"));

    // catalog attack pool is monsters; kit rule is ON: *.agent
    game = attackAgent(game, "GUARDA");
    assert.equal(game.worldModel.get("GUARDA")?.stats.mood, 1);
    assert.ok(game.story.includes("golpe"));
  });

  it("without mood does not mutate; missing rel is skipped", () => {
    let project = narrative.createProject("kit-social-mute", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
GOBLIN.{ tags: agent; links: current_location=SALA; name: Goblin; }
NPC.{ tags: agent; stats: mood=4; links: current_location=SALA; name: Npc; }
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

    const mute = executeIntent("intent.action.interact.talk.GOBLIN", game, q, interactWith);
    assert.equal(mute.executed, true);
    assert.equal(mute.game.worldModel.get("GOBLIN")?.stats.mood, undefined);

    const skipRel = executeIntent("intent.action.interact.talk.NPC", mute.game, q, interactWith);
    assert.equal(skipRel.executed, true);
    assert.equal(skipRel.game.worldModel.get("NPC")?.stats.mood, 5);
  });

  it("mood=0 talk does not raise mood; author rule still wins", () => {
    let project = narrative.createProject("kit-social-author", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; name: Sala; }
GUARDA.{ tags: agent; stats: mood=0; links: current_location=SALA, rel=REL_JOGADOR_GUARDA; name: Guarda; }
REL_JOGADOR_GUARDA.{ tags: relation, enemy; stats: affinity=-2; links: from=JOGADOR, to=GUARDA; }
CHEFE.{ tags: agent; stats: mood=3; links: current_location=SALA; name: Chefe; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# chefe
ON: CHEFE
IF: JOGADOR.intent=talk
narrativa: "O chefe já te conhece."
`,
    });
    project = kit.apply(project);
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));

    let result = executeIntent("intent.action.interact.talk.GUARDA", game, q, interactWith);
    assert.equal(result.executed, true);
    assert.equal(result.game.worldModel.get("GUARDA")?.stats.mood, 0);
    assert.equal(result.game.worldModel.get("REL_JOGADOR_GUARDA")?.stats.affinity, -2);
    assert.ok(result.game.story.includes("silêncio"));
    game = result.game;

    result = executeIntent("intent.action.interact.talk.CHEFE", game, q, interactWith);
    assert.equal(result.executed, true);
    assert.ok(result.game.story.includes("conhece"));
    assert.equal(result.game.worldModel.get("CHEFE")?.stats.mood, 3);
  });

  it("keeps author taxonomy children and still marks the kit", () => {
    let project = narrative.createProject("kit-social-merge", {
      entitiesSource: `JOGADOR.{ tags: agent; }
start()
`,
      taxonomySource: "relation → information\ncustom → object\n",
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    project = kit.apply(project);
    assert.equal((project.taxonomySource.match(/^relation\s*→/gm) ?? []).length, 1);
    assert.ok(project.taxonomySource.includes("memory"));
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
