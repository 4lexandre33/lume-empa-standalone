import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { intentCatalog } from "../../lib/catalog.ts";

describe("Intent catalog", () => {
  it("exposes the three families at the root", () => {
    const root = intentCatalog.getRoot();
    assert.equal(root.token, "intent");
    assert.equal(root.kind, "root");
    assert.deepEqual(root.childTokens, ["action", "cognize", "perceive"]);

    const families = intentCatalog.getChildren("");
    assert.deepEqual(
      families.map((n) => n.token),
      ["action", "cognize", "perceive"],
    );
    assert.ok(families.every((n) => n.kind === "family"));
  });

  it("lists perceive, cognize and action operations from the Phase 1 tree", () => {
    assert.deepEqual(intentCatalog.getChildren("perceive").map((n) => n.token), [
      "inspect",
      "listen",
      "locate",
      "observe",
    ]);
    assert.deepEqual(intentCatalog.getChildren("cognize").map((n) => n.token), [
      "compare",
      "decide",
      "evaluate",
      "remember",
    ]);
    assert.deepEqual(intentCatalog.getChildren("action").map((n) => n.token), [
      "communicate",
      "go",
      "interact",
      "inventory",
      "look",
      "move",
      "wait",
    ]);
    assert.deepEqual(intentCatalog.getChildren("action.interact").map((n) => n.token), [
      "ask",
      "attack",
      "bye",
      "close",
      "drop",
      "give",
      "lock",
      "open",
      "put",
      "take",
      "talk",
      "tell",
      "unlock",
      "use",
    ]);
  });

  it("declares signatures without embedding effects", () => {
    assert.deepEqual(intentCatalog.getSignature("action.wait"), []);
    assert.deepEqual(intentCatalog.getSignature("action.go"), [
      { name: "destination", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.look"), []);
    assert.deepEqual(intentCatalog.getSignature("action.inventory"), []);
    assert.deepEqual(intentCatalog.getSignature("action.interact.put"), [
      { name: "object", type: "entity", required: true },
      { name: "target", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.attack"), [
      { name: "target", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.give"), [
      { name: "object", type: "entity", required: true },
      { name: "receiver", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.ask"), [
      { name: "target", type: "entity", required: true },
      { name: "topic", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.tell"), [
      { name: "target", type: "entity", required: true },
      { name: "topic", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.bye"), [
      { name: "target", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.interact.use"), [
      { name: "object", type: "entity", required: true },
      { name: "target", type: "entity", required: false },
    ]);
    assert.deepEqual(intentCatalog.getSignature("perceive.observe"), [
      { name: "target", type: "scope", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("perceive.listen"), [
      { name: "target", type: "entity", required: false },
    ]);
    assert.deepEqual(intentCatalog.getSignature("cognize.compare"), [
      { name: "a", type: "entity", required: true },
      { name: "b", type: "entity", required: true },
    ]);
    assert.deepEqual(intentCatalog.getSignature("action.communicate"), [
      { name: "target", type: "entity", required: true },
    ]);
  });

  it("resolves paths with or without the intent prefix and rejects unknown ones", () => {
    const a = intentCatalog.getNode("action.interact.attack");
    const b = intentCatalog.getNode("intent.action.interact.attack");
    assert.ok(a && b);
    assert.equal(a.path, b.path);
    assert.equal(a.token, "attack");
    assert.equal(intentCatalog.getNode("action.fly"), null);
    assert.deepEqual(intentCatalog.getChildren("missing"), []);
    assert.deepEqual(intentCatalog.getSignature("missing"), []);
  });
});
