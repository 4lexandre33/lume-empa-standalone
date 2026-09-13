import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject, createProject, diagnose } from "./project.ts";
import { createExampleProject } from "./examples.ts";
import { buildWorldIndex, formatWorldIndex, validateWorld } from "./world-index.ts";
import { applyAdventureKit } from "../../kit-adventure/lib/kit.ts";
import { applyChannelKit } from "../../kit-channel/lib/kit.ts";

describe("world index and dialogue dead-ends", () => {
  it("lists rooms objects agents rules tags channels and patterns", () => {
    const project = createProject("idx", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; }
CHAVE.{ tags: object; links: current_location=SALA; }
ECONOMIA.{ tags: channel; stats: state=0; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

PADRAO vitoria
eventos: start
nome: Vitória
`,
      taxonomySource: `channel → abstract
`,
    });
    const compiled = compileProject(project);
    assert.equal(compiled.errors.length, 0);
    const index = buildWorldIndex(compiled.worldModel, compiled.rules, compiled.patterns, compiled.taxonomy);
    assert.deepEqual(index.places, ["SALA"]);
    assert.deepEqual(index.objects, ["CHAVE"]);
    assert.deepEqual(index.agents, ["JOGADOR"]);
    assert.ok(index.rules.some((r) => r.id === "start"));
    assert.ok(index.tags.includes("place"));
    assert.deepEqual(index.channels, ["ECONOMIA"]);
    assert.deepEqual(index.patterns, ["vitoria"]);
    const md = formatWorldIndex(index);
    assert.match(md, /## Salas/);
    assert.match(md, /- SALA/);
    assert.match(md, /## Padrões/);
  });

  it("warns on topic without ask, missing conv, one-state channel, vivo without reaction", () => {
    const project = createProject("becos", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; }
SEGREDO.{ tags: topic; }
NPC.{ tags: agent; links: conv=FANTASMA; }
ECONOMIA.{ tags: channel; stats: state=0; }
GOBLIN.{ tags: agent, vivo; links: current_location=SALA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# channel one
ON: ECONOMIA
narrativa: "um estado"
`,
      taxonomySource: `topic → information
channel → abstract
`,
    });
    const compiled = compileProject(project);
    const issues = validateWorld(compiled.worldModel, compiled.rules, compiled.taxonomy);
    assert.ok(issues.some((i) => i.code === "W010" && i.message.includes("SEGREDO")));
    assert.ok(issues.some((i) => i.code === "W011" && i.message.includes("FANTASMA")));
    assert.ok(issues.some((i) => i.code === "W012" && i.message.includes("ECONOMIA")));
    assert.ok(issues.some((i) => i.code === "W013" && i.message.includes("GOBLIN")));
    assert.equal(compiled.worldModel.get("SEGREDO")?.tags.has("topic"), true);
  });

  it("is silent when ask conv channel and vivo are covered", () => {
    let project = createProject("ok", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=SALA; }
SALA.{ tags: place; }
SEGREDO.{ tags: topic; }
NO.{ tags: information; }
NPC.{ tags: agent; links: conv=NO; }
ECONOMIA.{ tags: channel; stats: state=0; }
GOBLIN.{ tags: agent, vivo; links: current_location=SALA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"

# ask secret
ON: SEGREDO
IF: JOGADOR.intent=ask
narrativa: "conta"

# goblin
ON: GOBLIN
narrativa: "grita"
`,
      taxonomySource: `topic → information
channel → abstract
`,
    });
    project = applyChannelKit(project);
    const compiled = compileProject(project);
    const issues = validateWorld(compiled.worldModel, compiled.rules, compiled.taxonomy);
    assert.equal(issues.filter((i) => i.code === "W010").length, 0);
    assert.equal(issues.filter((i) => i.code === "W011").length, 0);
    assert.equal(issues.filter((i) => i.code === "W012").length, 0);
    assert.equal(issues.filter((i) => i.code === "W013").length, 0);
  });

  it("does not invent rules and leaves the cave without E10 warnings", () => {
    const cave = createExampleProject("goblin-cave");
    const before = cave.rulesSource;
    const { compiled, issues } = diagnose(cave);
    assert.equal(compiled.errors.length, 0);
    assert.equal(cave.rulesSource, before);
    assert.equal(issues.filter((i) => /^W01[0-3]$/.test(i.code)).length, 0);
    const kitted = applyAdventureKit(createExampleProject("goblin-cave"));
    assert.notEqual(kitted.rulesSource, before);
  });
});
