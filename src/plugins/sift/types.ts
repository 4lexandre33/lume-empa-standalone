import type { GameBeat } from "../narrative-engine/lib/runtime.ts";
import type { SiftHit, SiftPattern } from "../narrative-engine/lib/sift.ts";

export interface SiftService {
  id: "sift";
  parse(source: string): SiftPattern[];
  match(history: readonly Pick<GameBeat, "triggerId">[], patterns: readonly SiftPattern[]): SiftHit[];
  banner(hits: readonly SiftHit[]): string;
}
