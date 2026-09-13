import { cloneProject, toWireProject, type Project, type WireProject } from "./project.ts";
import { exportSession, parseSession, type SessionJson } from "./session.ts";
import { bannerOf } from "./sift.ts";
import type { GameState } from "./runtime.ts";

export const PLAY_KIND = "lume-play";

export type PlayBeat = { triggerId: string; story: string };

export type PlayBundle = {
  kind: typeof PLAY_KIND;
  project: WireProject;
  session: SessionJson | null;
  title: string;
  turns: number;
  score: number | null;
  banner: string;
  beats: PlayBeat[];
};

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(raw: string): Uint8Array | null {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((raw.length + 3) % 4);
  try {
    const bin = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function encodeJsonHash(value: unknown): string {
  return bytesToB64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeJsonHash(raw: string): unknown {
  const bytes = b64UrlToBytes(raw.trim());
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function buildPlayBundle(project: Project, game: GameState | null): PlayBundle {
  const player = game?.worldModel.get(game.playerEntityId);
  const score = player && typeof player.stats.score === "number" ? player.stats.score : null;
  return {
    kind: PLAY_KIND,
    project: toWireProject(cloneProject(project)),
    session: game ? exportSession(game) : null,
    title: project.meta.name,
    turns: game ? Math.max(0, game.history.length - 1) : 0,
    score,
    banner: game ? bannerOf(game.sifted ?? []) : "",
    beats: game ? game.history.map((beat) => ({ triggerId: beat.triggerId, story: beat.story })) : [],
  };
}

export function parsePlayBundle(raw: unknown): PlayBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.kind !== PLAY_KIND || !value.project || typeof value.project !== "object") return null;
  const session = value.session == null ? null : parseSession(value.session);
  const beats = Array.isArray(value.beats)
    ? value.beats
        .filter((beat): beat is PlayBeat => !!beat && typeof beat === "object" && typeof (beat as PlayBeat).story === "string")
        .map((beat) => ({ triggerId: String((beat as PlayBeat).triggerId ?? ""), story: (beat as PlayBeat).story }))
    : [];
  const score = typeof value.score === "number" ? value.score : null;
  return {
    kind: PLAY_KIND,
    project: value.project as WireProject,
    session,
    title: typeof value.title === "string" && value.title ? value.title : "Jogo",
    turns: typeof value.turns === "number" ? value.turns : 0,
    score,
    banner: typeof value.banner === "string" ? value.banner : "",
    beats,
  };
}

export function encodePlayHash(bundle: PlayBundle): string {
  return encodeJsonHash(bundle);
}

export function decodePlayHash(raw: string): PlayBundle | null {
  return parsePlayBundle(decodeJsonHash(raw));
}

export function encodeSessionHash(session: SessionJson): string {
  return encodeJsonHash(session);
}

export function decodeSessionHash(raw: string): SessionJson | null {
  return parseSession(decodeJsonHash(raw));
}

export function parseShareHash(hash: string): { play?: PlayBundle; session?: SessionJson } | null {
  const trimmed = hash.replace(/^#/, "");
  if (trimmed.startsWith("play=")) {
    const play = decodePlayHash(trimmed.slice(5));
    return play ? { play } : null;
  }
  if (trimmed.startsWith("sessao=")) {
    const session = decodeSessionHash(trimmed.slice(7));
    return session ? { session } : null;
  }
  return null;
}
