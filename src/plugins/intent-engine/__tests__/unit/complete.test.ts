import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySuggestion, isAutocompleteSlot } from "../../lib/complete.ts";

describe("applySuggestion", () => {
  it("starts from empty input at the intent root", () => {
    assert.equal(applySuggestion("", "action"), "intent.action.");
    assert.equal(applySuggestion("intent", "perceive"), "intent.perceive.");
    assert.equal(applySuggestion("intent.", "cognize"), "intent.cognize.");
  });

  it("replaces a partial token and appends a trailing dot while incomplete", () => {
    assert.equal(applySuggestion("intent.a", "action"), "intent.action.");
    assert.equal(applySuggestion("intent.action.", "move"), "intent.action.move.");
    assert.equal(applySuggestion("intent.action.mo", "move"), "intent.action.move.");
    assert.equal(applySuggestion("intent.action.interact.", "attack"), "intent.action.interact.attack.");
  });

  it("completes a leaf without a trailing dot", () => {
    assert.equal(applySuggestion("intent.action.", "wait"), "intent.action.wait");
    assert.equal(applySuggestion("intent.action.move.", "CAVERNA"), "intent.action.move.CAVERNA");
    assert.equal(applySuggestion("intent.perceive.observe.", "local"), "intent.perceive.observe.local");
  });
});

describe("isAutocompleteSlot", () => {
  it("opens only after a dot", () => {
    assert.equal(isAutocompleteSlot(""), false);
    assert.equal(isAutocompleteSlot("intent"), false);
    assert.equal(isAutocompleteSlot("intent."), true);
    assert.equal(isAutocompleteSlot("intent.action."), true);
    assert.equal(isAutocompleteSlot("intent.cognize."), true);
    assert.equal(isAutocompleteSlot("intent.perceive."), true);
    assert.equal(isAutocompleteSlot("intent.action.interact.take."), true);
    assert.equal(isAutocompleteSlot("intent.action.mo"), true);
  });

  it("treats the segment after semicolon as the autocomplete slot", () => {
    assert.equal(isAutocompleteSlot("intent.action.wait; intent."), true);
    assert.equal(isAutocompleteSlot("intent.action.wait; intent"), false);
    assert.equal(applySuggestion("intent.action.wait; intent.", "action"), "intent.action.wait; intent.action.");
    assert.equal(applySuggestion("intent.action.wait; intent.action.", "look"), "intent.action.wait; intent.action.look");
  });
});
