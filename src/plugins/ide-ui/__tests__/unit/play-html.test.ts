import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bootGame, createGame } from "../../../narrative-engine/lib/runtime.ts";
import { compileProject, createProject } from "../../../narrative-engine/lib/project.ts";
import { buildPlayBundle } from "../../../narrative-engine/lib/play-bundle.ts";
import { playShareUrl, sessionShareUrl, staticPlayHtml } from "../../lib/play-html.ts";

describe("static play html", () => {
  it("embeds title turns prompt and lume-play json", () => {
    const project = createProject("Html", {
      entitiesSource: `JOGADOR.{ tags: agent; }\nstart()\n`,
      rulesSource: `# start
ON: start
narrativa: "luz"
`,
    });
    const compiled = compileProject(project);
    const game = bootGame(createGame(compiled.worldModel, compiled.rules, "JOGADOR"));
    const bundle = buildPlayBundle(project, game);
    const url = playShareUrl("https://lume.example", "/", bundle);
    const html = staticPlayHtml(bundle, url);
    assert.match(html, /<title>Html<\/title>/);
    assert.match(html, /class="prompt">/);
    assert.match(html, /id="lume-play"/);
    assert.match(html, /luz/);
    assert.match(html, /#play=/);
    assert.match(sessionShareUrl("https://lume.example", "/", "abc"), /#sessao=abc/);
  });
});
