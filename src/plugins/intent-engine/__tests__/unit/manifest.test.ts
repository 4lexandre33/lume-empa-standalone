import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INTENT_ENGINE_MANIFEST } from "../../manifest.ts";

describe("Intent Engine Plugin Manifest", () => {
  it("has valid manifest identifier and version", () => {
    assert.equal(INTENT_ENGINE_MANIFEST.name, "lume-intent-engine");
    assert.equal(INTENT_ENGINE_MANIFEST.version, "1.0.0");
    assert.ok(INTENT_ENGINE_MANIFEST.description);
  });

  it("declares IntentEngine and IntentCatalog capabilities", () => {
    const provides = INTENT_ENGINE_MANIFEST.capabilities?.provides;
    assert.ok(provides);
    assert.equal(provides.length, 2);
    const names = provides.map((p) => p.name);
    assert.ok(names.includes("IntentEngine"));
    assert.ok(names.includes("IntentCatalog"));
  });

  it("requires narrative engine capabilities and optionally IdeState", () => {
    const mandatory = INTENT_ENGINE_MANIFEST.requires?.mandatory ?? [];
    const optional = INTENT_ENGINE_MANIFEST.requires?.optional ?? [];
    const mandatoryNames = mandatory.map((c) => c.name);
    assert.ok(mandatoryNames.includes("NarrativeEngine"));
    assert.ok(mandatoryNames.includes("Taxonomy"));
    assert.ok(mandatoryNames.includes("QueryEngine"));
    assert.ok(optional.some((c) => c.name === "IdeState"));
  });
});
