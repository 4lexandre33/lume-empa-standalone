import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bootGame, createGame, interactWith } from "./runtime.ts";
import { compileProject, createProject } from "./project.ts";
import { createExampleProject } from "./examples.ts";
import { replaySession } from "./session.ts";
import {
  buildPlayBundle,
  decodePlayHash,
  decodeSessionHash,
  encodePlayHash,
  encodeSessionHash,
  parsePlayBundle,
  parseShareHash,
  PLAY_KIND,
} from "./play-bundle.ts";

describe("play bundle export and replay", () => {
  it("roundtrips hash and replays the session", () => {
    const project = createProject("partilha", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: score=3; }\nPORTA.{ tags: object; }\nstart()\n`,
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
    let game = bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy, [], { seed: "p12" }));
    game = interactWith(game, "PORTA");
    const bundle = buildPlayBundle(project, game);
    assert.equal(bundle.kind, PLAY_KIND);
    assert.equal(bundle.score, 3);
    assert.equal(bundle.turns, 1);
    assert.ok(bundle.session);
    const parsed = parsePlayBundle(JSON.parse(JSON.stringify(bundle)));
    assert.ok(parsed);
    const replayed = replaySession(parsed.session!, compiled.rules, "JOGADOR", compiled.taxonomy, compiled.patterns);
    assert.deepEqual(
      replayed.history.map((b) => b.story),
      game.history.map((b) => b.story),
    );
    const again = decodePlayHash(encodePlayHash(bundle));
    assert.equal(again?.title, "partilha");
    assert.equal(decodeSessionHash(encodeSessionHash(bundle.session!))?.seed, "p12");
    assert.ok(parseShareHash(`#play=${encodePlayHash(bundle)}`)?.play);
    assert.ok(parseShareHash(`sessao=${encodeSessionHash(bundle.session!)}`)?.session);
    assert.equal(parsePlayBundle({ kind: "nope" }), null);
  });

  it("does not rewrite the cave", () => {
    const cave = createExampleProject("goblin-cave");
    const before = cave.rulesSource;
    const compiled = compileProject(cave);
    const game = bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    const bundle = buildPlayBundle(cave, game);
    assert.equal(cave.rulesSource, before);
    assert.ok(bundle.beats.length >= 1);
    assert.equal(parseShareHash("#other"), null);
  });
});
