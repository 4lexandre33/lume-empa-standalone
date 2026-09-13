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

function planetGame(): GameState {
  const compiled = compileProject(createExampleProject("planetarium"));
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

describe("example opt-in intent rules", () => {
  it("talk does not wake the sleeping goblin; attack does", () => {
    const cave = movePlayer(goblinGame(), "CAVERNA");
    const talked = execute("intent.action.interact.talk.GOBLIN", cave);
    assert.equal(talked.executed, true);
    assert.equal(talked.game.lastRule?.id, "falar_com_goblin");
    assert.equal(talked.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
    assert.match(talked.game.story, /ronca/i);

    const attacked = execute("intent.action.interact.attack.GOBLIN", cave);
    assert.equal(attacked.executed, true);
    assert.equal(attacked.game.lastRule?.id, "atacar_goblin");
    assert.equal(attacked.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), false);
    assert.equal(cave.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });

  it("legacy click without intent still wakes the goblin", () => {
    const game = goblinGame();
    const next = interactWith(game, "GOBLIN");
    assert.equal(next.lastRule?.id, "cutucar_goblin");
    assert.equal(next.worldModel.get("GOBLIN")?.tags.has("sleeping"), false);
  });

  it("take with intent uses the opt-in rule and still picks up the torch", () => {
    const game = goblinGame();
    const result = execute("intent.action.interact.take.TOCHA", game);
    assert.equal(result.game.lastRule?.id, "pegar_com_intent");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
  });

  it("talking to the astronomer uses the opt-in talk rule", () => {
    const game = planetGame();
    const result = execute("intent.action.interact.talk.ASTRONOMA", game);
    assert.equal(result.executed, true);
    assert.equal(result.game.lastRule?.id, "falar_com_astrônoma");
    assert.match(result.game.story, /carta|lente/i);
  });
});
