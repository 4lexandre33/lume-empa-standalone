import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject, createProject } from "../../../narrative-engine/lib/project.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { createGame } from "../../../narrative-engine/lib/runtime.ts";
import { query } from "../../../narrative-engine/lib/query.ts";
import type { GameState } from "../../../narrative-engine/types.ts";
import { resolveIntent, suggestIntent, type QueryFn } from "../../lib/resolver.ts";

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

function tokens(text: string, game: GameState): string[] {
  return suggestIntent(text, game, q).map((s) => s.token);
}

function compileGame(entities: string, taxonomy: string): GameState {
  const compiled = compileProject(
    createProject("Resolver fixture", {
      entitiesSource: entities,
      taxonomySource: taxonomy,
      rulesSource: `# start
ON: start
narrativa: "ok"

ON: *.monster
narrativa: "um monstro."

ON: *.agent
narrativa: "alguém."
`,
    }),
  );
  assert.equal(compiled.errors.length, 0);
  return createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy);
}

describe("Intent resolver (Query + Taxonomy)", () => {
  it("suggests the three families at the root", () => {
    const game = goblinGame();
    assert.deepEqual(tokens("intent.", game), ["action", "cognize", "perceive"]);
  });

  it("at the cave mouth, take suggests the torch and omits attack", () => {
    const game = goblinGame();
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, "ENTRADA");

    const interact = tokens("intent.action.interact.", game);
    assert.ok(interact.includes("take"));
    assert.ok(!interact.includes("use"));
    assert.ok(!interact.includes("attack"));
    assert.ok(!interact.includes("talk"));
    assert.ok(!interact.includes("give"));
    assert.ok(!interact.includes("open"));
    assert.ok(!interact.includes("put"));
    assert.ok(!interact.includes("drop"));
    assert.ok(!interact.includes("close"));
    assert.ok(!interact.includes("lock"));
    assert.ok(!interact.includes("unlock"));

    assert.deepEqual(tokens("intent.action.interact.take.", game), ["TOCHA"]);
    assert.deepEqual(tokens("intent.action.interact.attack.", game), []);
    assert.equal(resolveIntent("intent.action.interact.attack.GOBLIN", game, q).status, "TARGET_UNAVAILABLE");
  });

  it("move lists other places, not the current one", () => {
    const game = goblinGame();
    const places = tokens("intent.action.move.", game);
    assert.deepEqual(places.slice().sort(), ["CAVERNA", "TRILHA"]);
    assert.ok(!places.includes("ENTRADA"));
    assert.deepEqual(tokens("intent.action.go.", game).slice().sort(), ["CAVERNA", "TRILHA"]);
  });

  it("after moving to the cave, attack suggests GOBLIN via goblin → monster", () => {
    const game = movePlayer(goblinGame(), "CAVERNA");
    const interact = tokens("intent.action.interact.", game);
    assert.ok(interact.includes("attack"));
    assert.ok(interact.includes("talk"));
    assert.deepEqual(tokens("intent.action.interact.attack.", game), ["GOBLIN"]);
    assert.equal(suggestIntent("intent.action.interact.attack.", game, q)[0]?.label, "Goblin");

    const resolved = resolveIntent("intent.action.interact.attack.GOBLIN", game, q);
    assert.equal(resolved.status, "VALID");
    assert.equal(resolved.resolvedArgs?.target, "GOBLIN");
  });

  it("filters operations by prefix only after applying world context", () => {
    const entrance = goblinGame();
    assert.deepEqual(tokens("intent.action.interact.t", entrance), ["take"]);
    const cave = movePlayer(goblinGame(), "CAVERNA");
    assert.deepEqual(tokens("intent.action.interact.t", cave).sort(), ["take", "talk", "tell"]);
  });

  it("requires taxonomy inheritance for generic monster matching", () => {
    const entities = `JOGADOR.{
tags: agent;
links: current_location=CAVERNA;
}
CAVERNA.{
tags: place;
}
GOBLIN.{
tags: goblin;
links: current_location=CAVERNA;
}
`;
    const withoutTaxonomy = compileGame(entities, "");
    assert.deepEqual(tokens("intent.action.interact.attack.", withoutTaxonomy), []);

    const withTaxonomy = compileGame(entities, "goblin → monster\nmonster → agent\n");
    assert.deepEqual(tokens("intent.action.interact.attack.", withTaxonomy), ["GOBLIN"]);
    assert.ok(tokens("intent.action.interact.talk.", withTaxonomy).includes("GOBLIN"));
  });

  it("does not pick an ambiguous goblin silently", () => {
    const game = compileGame(
      `JOGADOR.{
tags: agent;
links: current_location=CAVERNA;
}
CAVERNA.{
tags: place;
}
GOBLIN_01.{
tags: goblin;
links: current_location=CAVERNA;
name: Goblin;
}
GOBLIN_02.{
tags: goblin;
links: current_location=CAVERNA;
name: Goblin;
}
`,
      "goblin → monster\n",
    );
    const suggestions = suggestIntent("intent.action.interact.attack.", game, q);
    assert.deepEqual(
      suggestions.map((s) => s.label).sort(),
      ["Goblin (GOBLIN_01)", "Goblin (GOBLIN_02)"],
    );
    const resolved = resolveIntent("intent.action.interact.attack.GOBLIN", game, q);
    assert.equal(resolved.status, "AMBIGUOUS");
    assert.equal(resolved.suggestions.length, 2);
  });

  it("observe offers local plus visible entities without leaking the distant goblin", () => {
    const game = goblinGame();
    const observe = tokens("intent.perceive.observe.", game);
    assert.ok(observe.includes("local"));
    assert.ok(observe.includes("TOCHA"));
    assert.ok(observe.includes("ENTRADA"));
    assert.ok(!observe.includes("GOBLIN"));
    assert.equal(resolveIntent("intent.perceive.observe.local", game, q).status, "VALID");
    assert.equal(resolveIntent("intent.perceive.observe.GOBLIN", game, q).status, "TARGET_UNAVAILABLE");
    assert.equal(resolveIntent("intent.perceive.locate.DRAGAO", game, q).status, "UNKNOWN");
  });

  it("does not mutate the world and wait stays valid without arguments", () => {
    const game = goblinGame();
    const location = game.worldModel.get("JOGADOR")?.links.current_location;
    const torchAt = game.worldModel.get("TOCHA")?.links.current_location;
    suggestIntent("intent.action.interact.take.TOCHA", game, q);
    const resolved = resolveIntent("intent.action.wait", game, q);
    assert.equal(resolved.status, "VALID");
    assert.equal(game.worldModel.get("JOGADOR")?.links.current_location, location);
    assert.equal(game.worldModel.get("TOCHA")?.links.current_location, torchAt);
  });
});
