import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIntent, catalogPathFromIntent, splitCommands, lastCommandText, joinCommandHead } from "../../lib/parser.ts";
import { intentCatalog } from "../../lib/catalog.ts";

describe("Intent parser", () => {
  it("treats empty input and the intent root as incomplete editing states", () => {
    const empty = parseIntent("");
    assert.equal(empty.status, "incomplete");
    assert.equal(empty.family, undefined);
    assert.deepEqual(empty.operation, []);
    assert.equal(empty.actor, "JOGADOR");
    assert.equal(empty.source, "player");

    const root = parseIntent("intent.");
    assert.equal(root.status, "incomplete");
    assert.equal(root.family, undefined);
    assert.deepEqual(
      intentCatalog.getChildren(catalogPathFromIntent(root)).map((n) => n.token),
      ["action", "cognize", "perceive"],
    );

    const bare = parseIntent("intent");
    assert.equal(bare.status, "incomplete");
  });

  it("parses the spec chain from intent. down to a complete attack", () => {
    const action = parseIntent("intent.action.");
    assert.equal(action.status, "incomplete");
    assert.equal(action.family, "action");
    assert.deepEqual(action.operation, []);
    assert.deepEqual(intentCatalog.getChildren(catalogPathFromIntent(action)).map((n) => n.token), [
      "communicate",
      "go",
      "interact",
      "inventory",
      "look",
      "move",
      "wait",
    ]);

    const interact = parseIntent("intent.action.interact.");
    assert.equal(interact.status, "incomplete");
    assert.deepEqual(interact.operation, ["interact"]);
    assert.deepEqual(
      intentCatalog.getChildren(catalogPathFromIntent(interact)).map((n) => n.token),
      ["ask", "attack", "bye", "close", "drop", "give", "lock", "open", "put", "take", "talk", "tell", "unlock", "use"],
    );

    const attack = parseIntent("intent.action.interact.attack.");
    assert.equal(attack.status, "incomplete");
    assert.deepEqual(attack.operation, ["interact", "attack"]);
    assert.deepEqual(attack.args, {});
    assert.deepEqual(intentCatalog.getSignature(catalogPathFromIntent(attack)), [
      { name: "target", type: "entity", required: true },
    ]);

    const complete = parseIntent("intent.action.interact.attack.goblin_01");
    assert.equal(complete.status, "complete");
    assert.equal(complete.family, "action");
    assert.deepEqual(complete.operation, ["interact", "attack"]);
    assert.equal(complete.args.target, "goblin_01");
    assert.equal(complete.error, undefined);
  });

  it("preserves argument case and accepts uppercase keywords", () => {
    const intent = parseIntent("INTENT.ACTION.INTERACT.ATTACK.GOBLIN");
    assert.equal(intent.status, "complete");
    assert.equal(intent.family, "action");
    assert.deepEqual(intent.operation, ["interact", "attack"]);
    assert.equal(intent.args.target, "GOBLIN");
  });

  it("completes wait with no arguments and rejects extras", () => {
    const wait = parseIntent("intent.action.wait");
    assert.equal(wait.status, "complete");
    assert.deepEqual(wait.operation, ["wait"]);
    assert.deepEqual(wait.args, {});

    const extra = parseIntent("intent.action.wait.now");
    assert.equal(extra.status, "invalid");
    assert.equal(extra.error?.code, "UNEXPECTED_ARGUMENT");

    const trailing = parseIntent("intent.action.wait.");
    assert.equal(trailing.status, "invalid");
    assert.equal(trailing.error?.code, "UNEXPECTED_ARGUMENT");

    const look = parseIntent("intent.action.look");
    assert.equal(look.status, "complete");
    assert.deepEqual(look.args, {});
    const lookExtra = parseIntent("intent.action.look.SALA");
    assert.equal(lookExtra.status, "invalid");

    const inventory = parseIntent("intent.action.inventory");
    assert.equal(inventory.status, "complete");
    assert.deepEqual(inventory.args, {});

    const go = parseIntent("intent.action.go.SALA");
    assert.equal(go.status, "complete");
    assert.equal(go.args.destination, "SALA");
  });

  it("fills multi-argument signatures and keeps incomplete when required args are missing", () => {
    const givePartial = parseIntent("intent.action.interact.give.apple");
    assert.equal(givePartial.status, "incomplete");
    assert.equal(givePartial.args.object, "apple");
    assert.equal(givePartial.args.receiver, undefined);

    const give = parseIntent("intent.action.interact.give.apple.merchant_01");
    assert.equal(give.status, "complete");
    assert.equal(give.args.object, "apple");
    assert.equal(give.args.receiver, "merchant_01");

    const put = parseIntent("intent.action.interact.put.ESPADA.CAIXA");
    assert.equal(put.status, "complete");
    assert.equal(put.args.object, "ESPADA");
    assert.equal(put.args.target, "CAIXA");

    const ask = parseIntent("intent.action.interact.ask.GOBLIN.CHAVE");
    assert.equal(ask.status, "complete");
    assert.equal(ask.args.target, "GOBLIN");
    assert.equal(ask.args.topic, "CHAVE");

    const tell = parseIntent("intent.action.interact.tell.GOBLIN.CHAVE");
    assert.equal(tell.status, "complete");
    assert.equal(tell.args.topic, "CHAVE");

    const bye = parseIntent("intent.action.interact.bye.GOBLIN");
    assert.equal(bye.status, "complete");
    assert.equal(bye.args.target, "GOBLIN");

    const compare = parseIntent("intent.cognize.compare.sword_01.sword_02");
    assert.equal(compare.status, "complete");
    assert.equal(compare.args.a, "sword_01");
    assert.equal(compare.args.b, "sword_02");

    const useOne = parseIntent("intent.action.interact.use.key");
    assert.equal(useOne.status, "complete");
    assert.equal(useOne.args.object, "key");
    assert.equal(useOne.args.target, undefined);

    const useTwo = parseIntent("intent.action.interact.use.key.door");
    assert.equal(useTwo.status, "complete");
    assert.equal(useTwo.args.target, "door");
  });

  it("treats optional-argument leaves as complete without a target", () => {
    const listen = parseIntent("intent.perceive.listen");
    assert.equal(listen.status, "complete");
    const listenDot = parseIntent("intent.perceive.listen.");
    assert.equal(listenDot.status, "incomplete");
    const listenDoor = parseIntent("intent.perceive.listen.door");
    assert.equal(listenDoor.status, "complete");
    assert.equal(listenDoor.args.target, "door");
  });

  it("marks unknown tokens, empty segments and bad roots as invalid", () => {
    const root = parseIntent("look.around");
    assert.equal(root.status, "invalid");
    assert.equal(root.error?.code, "UNKNOWN_ROOT");

    const unknown = parseIntent("intent.fly");
    assert.equal(unknown.status, "invalid");
    assert.equal(unknown.error?.code, "UNKNOWN_TOKEN");

    const emptySeg = parseIntent("intent.action..wait");
    assert.equal(emptySeg.status, "invalid");
    assert.equal(emptySeg.error?.code, "EMPTY_SEGMENT");

    const badIdent = parseIntent("intent.action.interact.attack.goblin-01");
    assert.equal(badIdent.status, "invalid");
    assert.equal(badIdent.error?.code, "INVALID_SYNTAX");
  });

  it("keeps unmatched prefixes as incomplete instead of invalid", () => {
    const prefix = parseIntent("intent.act");
    assert.equal(prefix.status, "incomplete");
    assert.equal(prefix.partialToken, "act");
    assert.equal(prefix.family, undefined);

    const talkPrefix = parseIntent("intent.action.interact.t");
    assert.equal(talkPrefix.status, "incomplete");
    assert.equal(talkPrefix.partialToken, "t");
    assert.deepEqual(talkPrefix.operation, ["interact"]);
  });

  it("does not execute and honors source/actor options", () => {
    const intent = parseIntent("intent.action.move.CAVERNA", { source: "button", actor: "HEROI" });
    assert.equal(intent.status, "complete");
    assert.equal(intent.source, "button");
    assert.equal(intent.actor, "HEROI");
    assert.equal(intent.args.destination, "CAVERNA");
    assert.equal(intent.raw, "intent.action.move.CAVERNA");
  });
});

describe("splitCommands", () => {
  it("splits on semicolon and ignores empty parts", () => {
    assert.deepEqual(splitCommands("intent.action.wait"), ["intent.action.wait"]);
    assert.deepEqual(splitCommands("intent.action.wait; intent.action.look"), [
      "intent.action.wait",
      "intent.action.look",
    ]);
    assert.deepEqual(splitCommands(" ; a ; ; b ; "), ["a", "b"]);
    assert.equal(lastCommandText("intent.action.wait; intent.action."), "intent.action.");
    assert.equal(joinCommandHead("intent.action.wait; intent.a", "intent.action.look"), "intent.action.wait; intent.action.look");
  });
});
