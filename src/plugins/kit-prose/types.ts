import type { GameBeat } from "../narrative-engine/lib/runtime.ts";
import type { NarrativeFunction } from "./data/functions.ts";
import type { RecapOptions } from "./lib/recap.ts";

export interface ProseService {
  id: "prose";
  functions: readonly NarrativeFunction[];
  recap(history: readonly GameBeat[], options?: RecapOptions): string;
}
