import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import { compileProject, createProject } from "../../../narrative-engine/lib/project.ts";
import { findMatchingRule, parseRuleBlock } from "../../../narrative-engine/lib/rule-engine.ts";
import { RULE_SEMANTICS_MANIFEST, createRuleSemanticsPlugin } from "../../index.ts";
import { classifyRule } from "../../lib/classify.ts";
import type { RuleSemanticsService } from "../../types.ts";

describe("Rule Semantics", () => {
  it("declares RuleSemantics and does not require RuleEffects", () => {
    assert.equal(RULE_SEMANTICS_MANIFEST.name, "lume-rule-semantics");
    assert.ok(RULE_SEMANTICS_MANIFEST.capabilities?.provides?.some((c) => c.name === "RuleSemantics"));
    assert.ok(RULE_SEMANTICS_MANIFEST.requires?.mandatory?.some((c) => c.name === "NarrativeEngine"));
  });

  it("infers kinds from AST and unions author SEMANTIC", () => {
    const transformation = parseRuleBlock(`# t
ON: JOGADOR
DO: JOGADOR.hp-10
narrativa: "hit"
`);
    assert.deepEqual(classifyRule({ ...transformation, index: 0, source: "" }), ["transformation"]);

    const mixed = parseRuleBlock(`# m
ON: PORTA
IF: JOGADOR.intent=open
IF: PORTA.!trancada
DO: PORTA.aberta
    PORTA.current_location=SALA
    CREATE FUMACA.event
    KNOW JOGADOR.PORTA
    INTENT GOBLIN.attack.JOGADOR
SEMANTIC: process
narrativa: "abre"
`);
    const kinds = classifyRule({ ...mixed, index: 0, source: "" });
    assert.ok(kinds.includes("constraint"));
    assert.ok(kinds.includes("transformation"));
    assert.ok(kinds.includes("relation"));
    assert.ok(kinds.includes("lifecycle"));
    assert.ok(kinds.includes("cognition"));
    assert.ok(kinds.includes("agency"));
    assert.ok(kinds.includes("process"));
  });

  it("infers process from WAIT and TICK without author SEMANTIC", () => {
    const wait = parseRuleBlock(`# w
ON: PORTA
DO: WAIT 3.FUSE
narrativa: "espera"
`);
    assert.deepEqual(classifyRule({ ...wait, index: 0, source: "" }), ["process"]);

    const tick = parseRuleBlock(`# t
ON: JOGADOR
DO: TICK
narrativa: "passa"
`);
    assert.deepEqual(classifyRule({ ...tick, index: 0, source: "" }), ["process"]);
  });

  it("registers the capability and does not change findMatchingRule", async () => {
    const core: Core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(RULE_SEMANTICS_MANIFEST, createRuleSemanticsPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-rule-semantics");
    const semantics = core.getService<RuleSemanticsService>("RuleSemantics");

    const project = createProject("sem", {
      entitiesSource: `PORTA.{ tags: object; stats: ; links: ; }\nstart()\n`,
      rulesSource: `# a
ON: PORTA
narrativa: "generica"

# b
ON: PORTA
IF: PORTA.aberta
narrativa: "aberta"
SEMANTIC: constraint
`,
    });
    const compiled = compileProject(project);
    assert.equal(compiled.errors.length, 0);
    const classified = compiled.rules.map((rule) => semantics.classify(rule));
    assert.ok(classified[1]?.includes("constraint"));
    const world = compiled.worldModel;
    world.get("PORTA")!.tags.add("aberta");
    const match = findMatchingRule("PORTA", compiled.rules, world, compiled.taxonomy);
    assert.equal(match?.id, "b");
  });
});
