import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject } from "../../../narrative-engine/lib/project.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { createGame, interactWith, rewindTo } from "../../../narrative-engine/lib/runtime.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import type { GameState } from "../../../narrative-engine/types.ts";
import { executeIntent, knownIdsFromHistory, type QueryFn } from "../../lib/index.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

function goblinGame(): GameState {
  const compiled = compileProject(createExampleProject("goblin-cave"));
  assert.equal(compiled.errors.length, 0);
  return createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy);
}

function movePlayer(game: GameState, place: string): GameState {
  const player = game.worldModel.get(game.playerEntityId);
  assert.ok(player);
  player.links.current_location = place;
  return game;
}

function execute(text: string, game: GameState) {
  return executeIntent(text, game, q, interactWith);
}

describe("PERCEIVE and COGNIZE", () => {
  it("inspects the torch without picking it up", () => {
    const game = goblinGame();
    const result = execute("intent.perceive.inspect.TOCHA", game);
    assert.equal(result.executed, true);
    assert.match(result.game.story, /Tocha|tocha/i);
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });

  it("rejects inspect of the distant goblin", () => {
    const game = goblinGame();
    const result = execute("intent.perceive.inspect.GOBLIN", game);
    assert.equal(result.executed, false);
    assert.equal(result.resolution.status, "TARGET_UNAVAILABLE");
    assert.equal(result.game, game);
  });

  it("inspects the sleeping goblin in the cave without waking it", () => {
    const game = movePlayer(goblinGame(), "CAVERNA");
    const result = execute("intent.perceive.inspect.GOBLIN", game);
    assert.equal(result.executed, true);
    assert.equal(result.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    assert.match(result.game.story, /Goblin|goblin/i);
  });

  it("remember then locate still works after leaving the cave", () => {
    let game = movePlayer(goblinGame(), "CAVERNA");
    const remembered = execute("intent.cognize.remember.GOBLIN", game);
    assert.equal(remembered.executed, true);
    assert.ok(knownIdsFromHistory(remembered.game).includes("GOBLIN"));
    assert.equal(remembered.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);

    game = movePlayer(remembered.game, "ENTRADA");
    const located = execute("intent.perceive.locate.GOBLIN", game);
    assert.equal(located.executed, true);
    assert.match(located.game.story, /Caverna/i);
    assert.equal(located.game.worldModel.get("JOGADOR")?.links.current_location, "ENTRADA");
    assert.equal(located.game.worldModel.get("GOBLIN")?.links.current_location, "CAVERNA");
    assert.equal(located.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });

  it("evaluate and compare do not change tags or links", () => {
    const game = goblinGame();
    const evaluated = execute("intent.cognize.evaluate.TOCHA", game);
    assert.equal(evaluated.executed, true);
    assert.match(evaluated.game.story, /Tocha|tocha/i);

    const compared = execute("intent.cognize.compare.TOCHA.ISQUEIRO", evaluated.game);
    assert.equal(compared.executed, true);
    assert.match(compared.game.story, /compara/i);
    assert.equal(compared.game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(compared.game.worldModel.get("ISQUEIRO")?.links.current_location, "JOGADOR");
  });

  it("decide records the option without touching the world", () => {
    const game = goblinGame();
    const result = execute("intent.cognize.decide.esperar", game);
    assert.equal(result.executed, true);
    assert.match(result.game.story, /esperar/i);
    assert.equal(result.game.worldModel.get("JOGADOR")?.links.current_location, "ENTRADA");
  });

  it("listen in the cave hears the sleeping goblin", () => {
    const game = movePlayer(goblinGame(), "CAVERNA");
    const result = execute("intent.perceive.listen", game);
    assert.equal(result.executed, true);
    assert.match(result.game.story, /ronco/i);
    assert.equal(result.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });

  it("rewind keeps a perceive beat instead of replaying it as a click", () => {
    const observed = execute("intent.perceive.observe.local", goblinGame());
    const taken = execute("intent.action.interact.take.TOCHA", observed.game);
    assert.equal(taken.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");

    const rewound = rewindTo(taken.game, 0);
    assert.equal(rewound.history.length, 1);
    assert.match(rewound.story, /observa/i);
    assert.equal(rewound.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });
});
