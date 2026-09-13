import type { WorldModel } from "../narrative-engine/types.ts";

export type NlpHit = {
  command: string;
  dryRun: boolean;
};

export interface NlpService {
  interpret(text: string, world: WorldModel): NlpHit | null;
  splitPhrases(text: string): string[];
}
