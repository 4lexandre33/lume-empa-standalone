import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject } from "../../../narrative-engine/lib/project.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import type { GameState } from "../../../narrative-engine/types.ts";
import { commandFromChoice, executeIntent, type QueryFn } from "../../lib/index.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

function goblinGame(): GameState {
  const compiled = compileProject(createExampleProject("goblin-cave"));
  assert.equal(compiled.errors.length, 0);
  return createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy);
}

describe("commandFromChoice", () => {
  it("maps preview buttons to Intent commands", () => {
    const game = goblinGame();
    assert.equal(commandFromChoice(game, "JOGADOR"), null);
    assert.equal(commandFromChoice(game, "ENTRADA"), null);
    assert.equal(commandFromChoice(game, "CAVERNA"), "intent.action.move.CAVERNA");
    assert.equal(commandFromChoice(game, "TRILHA"), "intent.action.move.TRILHA");
    assert.equal(commandFromChoice(game, "TOCHA"), "intent.action.interact.take.TOCHA");
    assert.equal(commandFromChoice(game, "ISQUEIRO"), "intent.action.interact.use.ISQUEIRO");
    assert.equal(commandFromChoice(game, "GOBLIN"), "intent.action.interact.attack.GOBLIN");
    assert.equal(commandFromChoice(game, "missing"), null);
  });

  it("clicking the torch button executes take through the adapter", () => {
    const game = goblinGame();
    const command = commandFromChoice(game, "TOCHA");
    assert.ok(command);
    const result = executeIntent(command, game, q, interactWith, { source: "button" });
    assert.equal(result.executed, true);
    assert.equal(result.resolution.intent.source, "button");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });
});
