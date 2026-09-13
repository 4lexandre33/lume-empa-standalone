import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { createGame, interactWith } from "../../../narrative-engine/lib/runtime.ts";
import { createExampleProject } from "../../../narrative-engine/lib/examples.ts";
import { findMatchingRule, parseRuleBlock, ruleSpecificity } from "../../../narrative-engine/lib/rule-engine.ts";
import { KIT_PROSE_MANIFEST, createKitProsePlugin, NARRATIVE_FUNCTIONS } from "../../index.ts";
import type { ProseService } from "../../types.ts";

describe("Prose kit", () => {
  let core: Core;
  let prose: ProseService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(KIT_PROSE_MANIFEST, createKitProsePlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-kit-prose");
    prose = core.getService<ProseService>("Prose");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares Prose and sogh/E5 function names", () => {
    assert.equal(KIT_PROSE_MANIFEST.name, "lume-kit-prose");
    assert.ok(prose.functions.includes("confrontation"));
    assert.ok(prose.functions.includes("transaction"));
    assert.ok(prose.functions.includes("discovery"));
    assert.ok(prose.functions.includes("curse"));
    assert.ok(prose.functions.includes("revelation"));
    assert.ok(prose.functions.includes("escalation"));
    assert.deepEqual([...prose.functions], [...NARRATIVE_FUNCTIONS]);
  });

  it("FUNCAO does not change match score; voice picks the listed block", () => {
    const cursed = parseRuleBlock(`# abre
ON: PORTA
IF: JOGADOR.intent=open
FUNCAO: curse
narrativa: "A porta abre."
narrativa: somber: "A porta range."
`);
    const plain = parseRuleBlock(`# abre
ON: PORTA
IF: JOGADOR.intent=open
narrativa: "A porta abre."
`);
    assert.equal(cursed.funcao, "curse");
    assert.equal(ruleSpecificity({ ...cursed, index: 0, source: "" }), ruleSpecificity({ ...plain, index: 1, source: "" }));

    let project = narrative.createProject("kit-prose-voice", {
      entitiesSource: `JOGADOR.{ tags: agent; }
PORTA.{ tags: object; name: Porta; }
NARRADOR.{ tags: abstract; voice: somber; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
FUNCAO: curse
narrativa: "A porta abre."
narrativa: somber: "A porta range."
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    const winner = findMatchingRule("PORTA", compiled.rules, compiled.worldModel, compiled.taxonomy);
    assert.equal(winner?.funcao, "curse");
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = interactWith(game, "PORTA");
    assert.equal(game.story, "A porta range.");
    assert.equal(game.history[game.history.length - 1]?.story, "A porta range.");
  });

  it("recap only reads history; focalizer and reverse are flashback", () => {
    let project = narrative.createProject("kit-prose-recap", {
      entitiesSource: `JOGADOR.{ tags: agent; }
PORTA.{ tags: object; name: Porta; }
GUARDA.{ tags: agent; name: Guarda; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# porta
ON: PORTA
narrativa: "A porta abre."

# guarda
ON: GUARDA
narrativa: "O guarda aceita."
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = interactWith(game, "PORTA");
    game = interactWith(game, "GUARDA");
    const before = game.history.length;
    const md = prose.recap(game.history, { order: "chrono" });
    assert.match(md, /\*\*PORTA\.\*\* A porta abre\./);
    assert.match(md, /\*\*GUARDA\.\*\* O guarda aceita\./);
    assert.ok(md.indexOf("PORTA") < md.indexOf("GUARDA"));
    const flash = prose.recap(game.history, { focalizer: "PORTA", order: "reverse", limit: 1 });
    assert.match(flash, /porta abre/);
    assert.equal(flash.includes("guarda"), false);
    assert.equal(game.history.length, before);
    assert.equal(game.worldModel.get("PORTA")?.tags.has("event"), false);
  });

  it("falls back to default narrativa without matching voice; cave unchanged", () => {
    let project = narrative.createProject("kit-prose-fallback", {
      entitiesSource: `JOGADOR.{ tags: agent; }
PORTA.{ tags: object; name: Porta; }
start()
`,
      taxonomySource: "",
      rulesSource: `# start
ON: start
narrativa: "ok"

# abre
ON: PORTA
narrativa: "A porta abre."
narrativa: somber: "A porta range."
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    let game = narrative.bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR", compiled.taxonomy));
    game = interactWith(game, "PORTA");
    assert.equal(game.story, "A porta abre.");

    const cave = createExampleProject("goblin-cave");
    const caveCompiled = narrative.compileProject(cave);
    assert.equal(caveCompiled.errors.length, 0);
  });
});
