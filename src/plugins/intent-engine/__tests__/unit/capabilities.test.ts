import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../index.ts";
import type { IntentCatalogService, IntentEngineService } from "../../types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";

describe("Intent Engine capabilities", () => {
  let core: Core;
  let engine: IntentEngineService;
  let catalog: IntentCatalogService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    engine = core.getService<IntentEngineService>("IntentEngine");
    catalog = core.getService<IntentCatalogService>("IntentCatalog");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("registers both capabilities after activation", () => {
    assert.ok(engine);
    assert.ok(catalog);
    assert.ok(core.listActivePlugins().includes("lume-intent-engine"));
    assert.equal(engine.getCatalog(), catalog);
  });

  it("parses commands through the IntentEngine service without touching the world", () => {
    const parsed = engine.parse("intent.action.interact.attack.GOBLIN");
    assert.equal(parsed.status, "complete");
    assert.equal(parsed.family, "action");
    assert.deepEqual(parsed.operation, ["interact", "attack"]);
    assert.equal(parsed.args.target, "GOBLIN");

    const children = catalog.getChildren("intent.");
    assert.deepEqual(
      children.map((n) => n.token),
      ["action", "cognize", "perceive"],
    );
  });

  it("resolves suggestions through QueryEngine with effective taxonomy", () => {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    const game = narrative.createGame(
      compiled.worldModel,
      compiled.rules,
      project.settings.playerEntityId,
      compiled.taxonomy,
    );

    assert.deepEqual(
      engine.suggest("intent.action.interact.take.", game).map((s) => s.token),
      ["TOCHA"],
    );
    assert.equal(engine.resolve("intent.action.interact.attack.GOBLIN", game).status, "TARGET_UNAVAILABLE");

    game.worldModel.get("JOGADOR")!.links.current_location = "CAVERNA";
    const attack = engine.resolve("intent.action.interact.attack.GOBLIN", game);
    assert.equal(attack.status, "VALID");
    assert.equal(attack.resolvedArgs?.target, "GOBLIN");
  });

  it("executes take through NarrativeEngine.interact and strips intent links", () => {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    const game = narrative.createGame(
      compiled.worldModel,
      compiled.rules,
      project.settings.playerEntityId,
      compiled.taxonomy,
    );

    const result = engine.execute("intent.action.interact.take.TOCHA", game);
    assert.equal(result.executed, true);
    assert.equal(result.triggerId, "TOCHA");
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    const actor = result.game.worldModel.get("JOGADOR");
    assert.ok(actor);
    assert.equal(actor.links.intent, undefined);
    assert.equal(actor.links.intent_target, undefined);
  });

  it("maps a preview choice to an Intent command", () => {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    const game = narrative.createGame(
      compiled.worldModel,
      compiled.rules,
      project.settings.playerEntityId,
      compiled.taxonomy,
    );
    assert.equal(engine.commandFromChoice(game, "TOCHA"), "intent.action.interact.take.TOCHA");
    assert.equal(engine.commandFromChoice(game, "CAVERNA"), "intent.action.move.CAVERNA");
  });

  it("completes command tokens for the CommandBar", () => {
    assert.equal(engine.applySuggestion("intent.action.", "move"), "intent.action.move.");
    assert.equal(engine.applySuggestion("intent.action.move.", "CAVERNA"), "intent.action.move.CAVERNA");
  });
});
