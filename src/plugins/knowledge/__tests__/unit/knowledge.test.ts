import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { KNOWLEDGE_MANIFEST, createKnowledgePlugin } from "../../index.ts";
import type { KnowledgeService } from "../../types.ts";

describe("Knowledge", () => {
  let core: Core;
  let narrative: NarrativeEngineService;
  let knowledge: KnowledgeService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(KNOWLEDGE_MANIFEST, createKnowledgePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-knowledge");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
    knowledge = core.getService<KnowledgeService>("Knowledge");
  });

  it("declares Knowledge capability", () => {
    assert.equal(KNOWLEDGE_MANIFEST.name, "lume-knowledge");
    assert.ok(KNOWLEDGE_MANIFEST.capabilities?.provides?.some((c) => c.name === "Knowledge"));
  });

  it("KNOW writes cognition on the agent and does not mutate INFORMATION", () => {
    const project = narrative.createProject("know", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: ; links: current_location=SALA; }
LORE.{ tags: information; stats: ; links: current_location=SALA; name: Pergaminho; }
SALA.{ tags: place; stats: ; links: ; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# ler
ON: LORE
DO: KNOW JOGADOR.LORE
narrativa: "leu"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(
      narrative.createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy),
    );
    const loreBefore = game.worldModel.get("LORE")!;
    game = narrative.interact(game, "LORE");
    assert.equal(knowledge.knows(game.worldModel, "JOGADOR", "LORE"), true);
    assert.deepEqual(knowledge.factsFor(game.worldModel, "JOGADOR"), ["LORE"]);
    assert.ok(game.worldModel.get("LORE")?.tags.has("information"));
    assert.equal(game.worldModel.get("LORE")?.links.current_location, loreBefore.links.current_location);
    assert.equal(game.worldModel.get("JOGADOR")?.tags.has("information"), false);
    assert.equal(knowledge.knows(game.worldModel, "JOGADOR", "SALA"), false);
  });
});
