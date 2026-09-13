import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject } from "../../../narrative-engine/lib/project.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import type { GameState } from "../../../narrative-engine/types.ts";
import { executeIntent, type QueryFn } from "../../lib/index.ts";

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

function intentLinks(game: GameState): string[] {
  const actor = game.worldModel.get(game.playerEntityId);
  assert.ok(actor);
  return Object.keys(actor.links).filter((key) => key === "intent" || key.startsWith("intent_"));
}

function execute(text: string, game: GameState) {
  return executeIntent(text, game, q, interactWith);
}

describe("Intent adapter", () => {
  it("takes the torch through existing interact() and leaves the input world untouched", () => {
    const game = goblinGame();
    const result = execute("intent.action.interact.take.TOCHA", game);

    assert.equal(result.executed, true);
    assert.equal(result.resolution.status, "VALID");
    assert.equal(result.triggerId, "TOCHA");
    assert.notEqual(result.game, game);
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(result.game.lastInteractionId, "TOCHA");
    assert.equal(result.game.lastRule?.id, "pegar_com_intent");
    assert.deepEqual(intentLinks(result.game), []);
    assert.match(result.game.story, /pega/i);
  });

  it("rejects attack at the cave mouth without mutating the world", () => {
    const game = goblinGame();
    const result = execute("intent.action.interact.attack.GOBLIN", game);

    assert.equal(result.executed, false);
    assert.equal(result.resolution.status, "TARGET_UNAVAILABLE");
    assert.equal(result.game, game);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    assert.equal(game.history.length, 0);
  });

  it("attacks the goblin in the cave via the existing sleeping rule", () => {
    const game = movePlayer(goblinGame(), "CAVERNA");
    const result = execute("intent.action.interact.attack.GOBLIN", game);

    assert.equal(result.executed, true);
    assert.equal(result.triggerId, "GOBLIN");
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    assert.equal(result.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), false);
    assert.equal(result.game.worldModel.get("JOGADOR")?.stats.fear, 9);
    assert.equal(result.game.lastRule?.id, "atacar_goblin");
    assert.deepEqual(intentLinks(result.game), []);
  });

  it("revalidates before execute when the world changes after a valid suggestion", () => {
    const game = movePlayer(goblinGame(), "CAVERNA");
    assert.equal(execute("intent.action.interact.attack.GOBLIN", goblinGame()).executed, false);

    const goblin = game.worldModel.get("GOBLIN");
    assert.ok(goblin);
    goblin.links.current_location = "TRILHA";

    const result = execute("intent.action.interact.attack.GOBLIN", game);
    assert.equal(result.executed, false);
    assert.equal(result.resolution.status, "TARGET_UNAVAILABLE");
    assert.equal(result.game, game);
    assert.equal(game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    assert.equal(game.worldModel.get("GOBLIN")?.links.current_location, "TRILHA");
  });

  it("observe.local narrates without mutating the world", () => {
    const game = goblinGame();
    const result = execute("intent.perceive.observe.local", game);
    assert.equal(result.resolution.status, "VALID");
    assert.equal(result.executed, true);
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
    assert.equal(game.history.length, 0);
    assert.equal(result.game.history.length, 1);
    assert.match(result.game.story, /observa|Tocha|Boca/i);
    assert.equal(result.game.lastRule, null);
  });

  it("look targets the current place and inventory targets the actor", () => {
    const game = goblinGame();
    const look = execute("intent.action.look", game);
    assert.equal(look.executed, true);
    assert.equal(look.triggerId, "ENTRADA");
    assert.deepEqual(intentLinks(look.game), []);

    const inventory = execute("intent.action.inventory", game);
    assert.equal(inventory.executed, true);
    assert.equal(inventory.triggerId, "JOGADOR");
    assert.deepEqual(intentLinks(inventory.game), []);
  });

  it("executes wait against the actor and clears intent links", () => {
    const game = goblinGame();
    const result = execute("intent.action.wait", game);
    assert.equal(result.executed, true);
    assert.equal(result.triggerId, "JOGADOR");
    assert.deepEqual(intentLinks(result.game), []);
    assert.equal(result.game.history.length, 1);
    assert.equal(game.history.length, 0);
  });

  it("runs a; b through the same execute and stops on failure", () => {
    const game = goblinGame();
    const both = execute("intent.action.interact.take.TOCHA; intent.action.wait", game);
    assert.equal(both.executed, true);
    assert.equal(both.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(both.game.history.length, 2);
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");

    const stop = execute("intent.action.interact.attack.GOBLIN; intent.action.interact.take.TOCHA", game);
    assert.equal(stop.executed, false);
    assert.equal(stop.game, game);
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");

    const prefix = execute("intent.action.interact.take.TOCHA; intent.action.interact.attack.GOBLIN", game);
    assert.equal(prefix.executed, true);
    assert.equal(prefix.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(prefix.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });
});
