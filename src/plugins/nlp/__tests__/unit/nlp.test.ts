import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { INTENT_ENGINE_MANIFEST, createIntentEnginePlugin } from "../../../intent-engine/index.ts";
import type { IntentEngineService } from "../../../intent-engine/types.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { NLP_MANIFEST, createNlpPlugin, interpret, looksLikeIntent } from "../../index.ts";
import type { NlpService } from "../../types.ts";
import { DRY_RUN_NOTICE } from "../../../intent-engine/lib/notices.ts";

describe("Nlp", () => {
  let core: Core;
  let narrative: NarrativeEngineService;
  let intent: IntentEngineService;
  let nlp: NlpService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(INTENT_ENGINE_MANIFEST, createIntentEnginePlugin);
    core.registerPlugin(NLP_MANIFEST, createNlpPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-intent-engine");
    await core.activatePlugin("lume-nlp");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    intent = core.getService<IntentEngineService>("IntentEngine");
    nlp = core.getService<NlpService>("Nlp");
  });

  afterEach(async () => {
    await core.deactivatePlugin("lume-nlp");
  });

  function cave() {
    const project = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    return narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
  }

  it("declares Nlp and requires IntentEngine", () => {
    assert.equal(NLP_MANIFEST.name, "lume-nlp");
    assert.ok(NLP_MANIFEST.capabilities?.provides?.some((c) => c.name === "Nlp"));
    assert.ok(NLP_MANIFEST.requires?.mandatory?.some((c) => c.name === "IntentEngine"));
    assert.ok(nlp.interpret);
  });

  it("leaves dotted intent untouched", () => {
    const game = cave();
    assert.equal(looksLikeIntent("intent.action.interact.take.TOCHA"), true);
    assert.equal(interpret("intent.action.interact.take.TOCHA", game.worldModel), null);
    const executed = intent.execute("intent.action.interact.take.TOCHA", game);
    assert.equal(executed.executed, true);
    assert.equal(executed.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
  });

  it("maps a Portuguese phrase onto take and executes the same intent", () => {
    const game = cave();
    assert.deepEqual(nlp.interpret("pega a tocha", game.worldModel), {
      command: "intent.action.interact.take.TOCHA",
      dryRun: false,
    });
    const result = intent.execute("pega a tocha", game);
    assert.equal(result.executed, true);
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });

  it("maps English take by entity id and compounds through the same execute", () => {
    const game = cave();
    assert.deepEqual(nlp.interpret("take tocha. wait", game.worldModel), {
      command: "intent.action.interact.take.TOCHA; intent.action.wait",
      dryRun: false,
    });
    const result = intent.execute("take tocha. espera", game);
    assert.equal(result.executed, true);
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.ok(result.game.history.length >= 2);
  });

  it("fails closed on unknown verbs and ambiguous names", () => {
    const game = cave();
    assert.equal(nlp.interpret("dance with the goblin", game.worldModel), null);
    const cloned = game.worldModel.get("ISQUEIRO");
    assert.ok(cloned);
    cloned.extra = { ...cloned.extra, name: "Tocha" };
    assert.equal(nlp.interpret("pega a tocha", game.worldModel), null);
  });

  it("marks posso / can i as dry-run and does not execute", () => {
    const game = cave();
    assert.deepEqual(nlp.interpret("posso pegar a tocha", game.worldModel), {
      command: "intent.action.interact.take.TOCHA",
      dryRun: true,
    });
    const result = intent.execute("can i take tocha", game);
    assert.equal(result.executed, false);
    assert.equal(result.resolution.status, "VALID");
    assert.equal(result.dryRun, true);
    assert.equal(result.resolution.message, DRY_RUN_NOTICE);
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });

  it("does not change goblin-cave dotted play", () => {
    const game = cave();
    const result = intent.execute("intent.action.interact.talk.GOBLIN", game);
    assert.equal(result.executed, false);
    const moved = { ...game, worldModel: game.worldModel };
    moved.worldModel.get("JOGADOR")!.links.current_location = "CAVERNA";
    const talk = intent.execute("intent.action.interact.talk.GOBLIN", moved);
    assert.equal(talk.executed, true);
    assert.equal(talk.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });

  it("maps Sharpee synonyms onto existing intents and still fails closed", () => {
    const game = cave();
    assert.deepEqual(nlp.interpret("get tocha", game.worldModel), {
      command: "intent.action.interact.take.TOCHA",
      dryRun: false,
    });
    assert.deepEqual(nlp.interpret("examine tocha", game.worldModel), {
      command: "intent.perceive.inspect.TOCHA",
      dryRun: false,
    });
    assert.deepEqual(nlp.interpret("listen", game.worldModel), {
      command: "intent.perceive.listen.local",
      dryRun: false,
    });
    assert.equal(nlp.interpret("dance with the goblin", game.worldModel), null);
    assert.deepEqual(nlp.interpret("kill goblin", game.worldModel), {
      command: "intent.action.interact.attack.GOBLIN",
      dryRun: false,
    });
  });
});
