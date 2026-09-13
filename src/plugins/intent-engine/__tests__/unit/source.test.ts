import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject } from "../../../narrative-engine/lib/project.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import type { GameState } from "../../../narrative-engine/types.ts";
import { executeIntent, resolveIntent, suggestIntent, type QueryFn } from "../../lib/index.ts";

const q: QueryFn = (matcher, world, triggerId, taxonomy) =>
  query(matcher, world, triggerId, taxonomy, "effective").map(([id]) => id);

function goblinGame(): GameState {
  const compiled = compileProject(createExampleProject("goblin-cave"));
  assert.equal(compiled.errors.length, 0);
  return createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy);
}

function npc(actor: string) {
  return { source: "npc" as const, actor };
}

function execute(text: string, game: GameState, options?: { source?: "player" | "button" | "npc" | "script"; actor?: string }) {
  return executeIntent(text, game, q, interactWith, options);
}

describe("NPC and script sources", () => {
  it("keeps source and actor on the same Intent", () => {
    const game = goblinGame();
    const npcIntent = resolveIntent("intent.perceive.observe.local", game, q, npc("GOBLIN"));
    assert.equal(npcIntent.intent.source, "npc");
    assert.equal(npcIntent.intent.actor, "GOBLIN");
    assert.equal(npcIntent.status, "VALID");

    const scripted = resolveIntent("intent.action.interact.take.TOCHA", game, q, { source: "script", actor: "JOGADOR" });
    assert.equal(scripted.intent.source, "script");
    assert.equal(scripted.intent.actor, "JOGADOR");
    assert.equal(scripted.status, "VALID");
  });

  it("resolves the world from the NPC's location, not the player's", () => {
    const game = goblinGame();
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, "ENTRADA");
    assert.equal(game.worldModel.get("GOBLIN")?.links.current_location, "CAVERNA");

    assert.equal(resolveIntent("intent.action.interact.take.TOCHA", game, q, npc("GOBLIN")).status, "TARGET_UNAVAILABLE");
    assert.equal(resolveIntent("intent.action.interact.take.OURO", game, q, npc("GOBLIN")).status, "VALID");
    assert.equal(resolveIntent("intent.action.interact.take.OURO", game, q).status, "TARGET_UNAVAILABLE");

    const take = suggestIntent("intent.action.interact.take.", game, q, npc("GOBLIN")).map((s) => s.token);
    assert.deepEqual(take, ["OURO"]);
  });

  it("lets an NPC observe the cave without moving the player or waking itself", () => {
    const game = goblinGame();
    const result = execute("intent.perceive.observe.local", game, npc("GOBLIN"));
    assert.equal(result.executed, true);
    assert.equal(result.resolution.intent.source, "npc");
    assert.equal(result.resolution.intent.actor, "GOBLIN");
    assert.match(result.game.story, /Caverna/i);
    assert.match(result.game.story, /ouro/i);
    assert.doesNotMatch(result.game.story, /Boca da caverna/i);
    assert.equal(result.game.worldModel.get("JOGADOR")?.links.current_location, "ENTRADA");
    assert.equal(result.game.worldModel.get("GOBLIN")?.tags.has("sleeping"), true);
  });

  it("runs a scripted player command through the same execute path", () => {
    const game = goblinGame();
    const result = execute("intent.action.interact.take.TOCHA", game, { source: "script", actor: "JOGADOR" });
    assert.equal(result.executed, true);
    assert.equal(result.resolution.intent.source, "script");
    assert.equal(result.game.worldModel.get("TOCHA")?.links.current_location, "JOGADOR");
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, "ENTRADA");
  });

  it("only lets the goblin talk to the player when they share a place", () => {
    const game = goblinGame();
    assert.equal(resolveIntent("intent.action.interact.talk.JOGADOR", game, q, npc("GOBLIN")).status, "TARGET_UNAVAILABLE");

    game.worldModel.get("JOGADOR")!.links.current_location = "CAVERNA";
    const talked = resolveIntent("intent.action.interact.talk.JOGADOR", game, q, npc("GOBLIN"));
    assert.equal(talked.status, "VALID");
    assert.equal(talked.resolvedArgs?.target, "JOGADOR");
  });
});
