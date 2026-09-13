import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject, createProject } from "./project.ts";
import { bootGame, createGame, interactWith, rewindTo } from "./runtime.ts";
import { exportSession, replaySession } from "./session.ts";
import { emptySkein, mergeSkein, recordPath } from "./skein.ts";
import { createExampleProject } from "./examples.ts";

describe("session seed and replay", () => {
  it("stores seed on createGame and keeps it across rewind", () => {
    const project = createProject("seed", {
      entitiesSource: `JOGADOR.{ tags: agent; }\nPORTA.{ tags: object; }\nstart()\n`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# porta
ON: PORTA
narrativa: "abre"
`,
    });
    const compiled = compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = bootGame(
      createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy, compiled.patterns, { seed: "s-7" }),
    );
    assert.equal(game.seed, "s-7");
    game = interactWith(game, "PORTA");
    game = rewindTo(game, 0);
    assert.equal(game.seed, "s-7");
    assert.equal(game.history[0]?.triggerId, "start");
  });

  it("replays export JSON to the same stories", () => {
    const project = createProject("sessao", {
      entitiesSource: `JOGADOR.{ tags: agent; }\nA.{ tags: object; }\nB.{ tags: object; }\nstart()\n`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# a
ON: A
narrativa: "um"

# b
ON: B
narrativa: "dois"
`,
    });
    const compiled = compileProject(project);
    let game = bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy, [], { seed: "abc" }));
    game = interactWith(game, "A");
    game = interactWith(game, "B");
    const session = exportSession(game);
    assert.equal(session.seed, "abc");
    assert.deepEqual(session.triggerIds, ["start", "A", "B"]);
    const replayed = replaySession(session, compiled.rules, "JOGADOR", compiled.taxonomy, compiled.patterns);
    assert.equal(replayed.seed, "abc");
    assert.deepEqual(
      replayed.history.map((b) => b.story),
      game.history.map((b) => b.story),
    );
  });

  it("records Skein branches after rewind and keeps the cave equal", () => {
    let tree = emptySkein();
    tree = recordPath(tree, ["start", "A", "B"]);
    tree = recordPath(tree, ["start", "A", "C"]);
    assert.equal(tree.children[0]?.triggerId, "start");
    assert.equal(tree.children[0]?.children[0]?.triggerId, "A");
    assert.deepEqual(
      tree.children[0]?.children[0]?.children.map((n) => n.triggerId),
      ["B", "C"],
    );
    const merged = mergeSkein(tree, recordPath(emptySkein(), ["start", "D"]));
    assert.ok(merged.children[0]?.children.some((n) => n.triggerId === "A"));
    assert.ok(merged.children[0]?.children.some((n) => n.triggerId === "D"));

    const cave = createExampleProject("goblin-cave");
    const compiled = compileProject(cave);
    assert.equal(compiled.errors.length, 0);
    const game = bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    assert.equal(game.seed, "");
  });
});
