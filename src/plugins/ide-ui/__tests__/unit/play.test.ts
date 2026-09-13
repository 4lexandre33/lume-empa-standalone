import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playHud } from "../../lib/play.ts";
import { DRY_RUN_NOTICE } from "../../../intent-engine/lib/notices.ts";

describe("play skin hud", () => {
  it("shows title turn and optional score", () => {
    assert.deepEqual(playHud("Caverna", 1, {}), { title: "Caverna", turn: 0, score: null });
    assert.deepEqual(playHud("Caverna", 4, { score: 12, fear: 1 }), { title: "Caverna", turn: 3, score: 12 });
    assert.equal(DRY_RUN_NOTICE, "Pergunta hipotética: nenhuma acção foi executada.");
  });
});
