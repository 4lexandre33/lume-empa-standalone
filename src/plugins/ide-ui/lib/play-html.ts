import { renderMarkdown } from "../../narrative-engine/lib/narrative.ts";
import type { PlayBundle } from "../../narrative-engine/lib/play-bundle.ts";
import { encodePlayHash } from "../../narrative-engine/lib/play-bundle.ts";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function playShareUrl(origin: string, pathname: string, bundle: PlayBundle): string {
  return `${origin}${pathname || "/"}#play=${encodePlayHash(bundle)}`;
}

export function sessionShareUrl(origin: string, pathname: string, hash: string): string {
  return `${origin}${pathname}#sessao=${hash}`;
}

export function staticPlayHtml(bundle: PlayBundle, playUrl: string): string {
  const beats = bundle.beats
    .map((beat) => `<article class="beat">${renderMarkdown(beat.story)}</article>`)
    .join("\n");
  const score = bundle.score == null ? "" : `<span>score ${bundle.score}</span>`;
  const banner = bundle.banner ? `<p class="banner">${escapeHtml(bundle.banner)}</p>` : "";
  const href = escapeHtml(playUrl);
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(bundle.title)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font-family: Georgia, serif; background: #101012; color: #eceae6; }
  header { display: flex; gap: 12px; align-items: baseline; border-bottom: 1px solid #2a2a30; padding: 12px 16px; }
  h1 { font-size: 22px; margin: 0; font-weight: 500; }
  .meta { font-family: ui-monospace, monospace; font-size: 11px; color: #8b8d94; }
  main { padding: 20px 16px 48px; max-width: 40rem; }
  .banner { border-bottom: 1px solid #2a2a30; padding: 8px 16px; margin: 0; }
  .beat { font-size: 17px; line-height: 1.4; margin: 0 0 12px; }
  .prompt { font-family: ui-monospace, monospace; color: #8b8d94; padding: 12px 16px; border-top: 1px solid #2a2a30; }
  a { color: #8aa4c1; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(bundle.title)}</h1>
  <span class="meta">turno ${bundle.turns}</span>
  ${score ? `<span class="meta">${score}</span>` : ""}
</header>
${banner}
<main>
${beats || "<p class='beat'>Ainda não há prosa.</p>"}
</main>
<p class="prompt">></p>
<p class="prompt"><a href="${href}">Abrir no Lume</a></p>
<script type="application/json" id="lume-play">${embedJson(bundle)}</script>
</body>
</html>
`;
}
