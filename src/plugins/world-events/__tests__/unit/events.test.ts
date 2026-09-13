import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { WorldEventOccurredEvent } from "../../../../core/contracts/typed-event.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { WORLD_EVENTS_MANIFEST, createWorldEventsPlugin } from "../../index.ts";

describe("World Events", () => {
  let core: Core;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(WORLD_EVENTS_MANIFEST, createWorldEventsPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-world-events");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares WorldEvents and requires RuleEffects", () => {
    assert.equal(WORLD_EVENTS_MANIFEST.name, "lume-world-events");
    assert.ok(WORLD_EVENTS_MANIFEST.requires?.mandatory?.some((c) => c.name === "RuleEffects"));
  });

  it("EMIT creates an event entity and chains ON for that id", async () => {
    const seen: string[] = [];
    core.on(WorldEventOccurredEvent, (evt) => {
      seen.push(evt.data.eventId);
    });
    const project = narrative.createProject("emit", {
      entitiesSource: `BOTAO.{ tags: object; stats: ; links: ; }\nstart()\n`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# tocar
ON: BOTAO
DO: EMIT acordou
narrativa: "soa"

# eco
ON: acordou
narrativa: "eco"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "BOTAO");
    assert.ok(game.worldModel.get("acordou")?.tags.has("event"));
    assert.ok(game.history.some((b) => b.triggerId === "BOTAO"));
    assert.ok(game.history.some((b) => b.triggerId === "acordou"));
    assert.match(game.history.find((b) => b.triggerId === "acordou")!.story, /eco/);
    await Promise.resolve();
    assert.ok(seen.includes("acordou"));
  });

  it("caps recursive EMIT", () => {
    const project = narrative.createProject("loop", {
      entitiesSource: `X.{ tags: event; stats: ; links: ; }\nstart()\n`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# loop
ON: X
DO: EMIT X
narrativa: "x"
`,
    });
    const compiled = narrative.compileProject(project);
    let game = narrative.bootGame(narrative.createGame(compiled.worldModel, compiled.rules));
    game = narrative.interact(game, "X");
    assert.ok(game.history.filter((b) => b.triggerId === "X").length <= 5);
  });
});
