import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { StorySiftedEvent } from "../../../../core/contracts/typed-event.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createGame, interactWith, rewindTo } from "../../../narrative-engine/lib/runtime.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { WORLD_EVENTS_MANIFEST, createWorldEventsPlugin } from "../../../world-events/index.ts";
import { SIFT_MANIFEST, createSiftPlugin, bannerOf, parsePadrao } from "../../index.ts";
import type { SiftService } from "../../types.ts";

const SOURCE = `PADRAO corrupcao_guarda
  eventos: suborno, aceite, canal_corrupted
  nome: The Corruption of the Gate Guard
`;

describe("Sift", () => {
  let core: Core;
  let sift: SiftService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(WORLD_EVENTS_MANIFEST, createWorldEventsPlugin);
    core.registerPlugin(SIFT_MANIFEST, createSiftPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-world-events");
    await core.activatePlugin("lume-sift");
    sift = core.getService<SiftService>("Sift");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares Sift and parses PADRAO without touching the matcher", () => {
    assert.equal(SIFT_MANIFEST.name, "lume-sift");
    const patterns = sift.parse(SOURCE);
    assert.equal(patterns.length, 1);
    assert.equal(patterns[0]?.id, "corrupcao_guarda");
    assert.deepEqual(patterns[0]?.events, ["suborno", "aceite", "canal_corrupted"]);
    assert.equal(patterns[0]?.name, "The Corruption of the Gate Guard");
    assert.equal(bannerOf(sift.match([], patterns)), "");
  });

  it("reconstructs hits from history subsequence; rewind drops them; world intact", async () => {
    const seen: string[] = [];
    core.on(StorySiftedEvent, (evt) => {
      seen.push(evt.data.patternId);
    });
    let project = narrative.createProject("sift-room", {
      entitiesSource: `JOGADOR.{ tags: agent; }
A.{ tags: object; }
B.{ tags: object; }
C.{ tags: object; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# a
ON: A
DO: EMIT suborno
narrativa: "a"

# sub
ON: suborno
narrativa: "sub"

# b
ON: B
DO: EMIT aceite
narrativa: "b"

# ace
ON: aceite
narrativa: "ace"

# c
ON: C
DO: EMIT canal_corrupted
narrativa: "c"

# canal
ON: canal_corrupted
narrativa: "canal"

${SOURCE}
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    assert.equal(compiled.patterns[0]?.id, "corrupcao_guarda");
    let game = narrative.bootGame(
      createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy, compiled.patterns),
    );
    game = interactWith(game, "A");
    assert.equal(game.sifted.length, 0);
    game = interactWith(game, "B");
    assert.equal(game.sifted.length, 0);
    game = await narrative.interactAsync(game, "C");
    assert.equal(game.sifted.length, 1);
    assert.equal(game.sifted[0]?.name, "The Corruption of the Gate Guard");
    assert.equal(game.worldModel.get("A")?.tags.has("event"), false);
    assert.match(sift.banner(game.sifted), /Corruption/);
    await Promise.resolve();
    assert.ok(seen.includes("corrupcao_guarda"));

    const before = game.history.length;
    game = rewindTo(game, game.history.findIndex((b) => b.triggerId === "B"));
    assert.ok(game.history.length < before);
    assert.equal(game.sifted.length, 0);
  });

  it("does not alter official examples", () => {
    const cave = createExampleProject("goblin-cave");
    const compiled = narrative.compileProject(cave);
    assert.equal(compiled.errors.length, 0);
    assert.deepEqual(compiled.patterns, []);
    const parsed = parsePadrao(cave.rulesSource);
    assert.deepEqual(parsed, []);
  });
});
