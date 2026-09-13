import type { GameBeat } from "../../narrative-engine/lib/runtime.ts";

export type RecapOrder = "chrono" | "reverse";

export type RecapOptions = {
  focalizer?: string;
  order?: RecapOrder;
  limit?: number;
};

export function recap(history: readonly GameBeat[], options: RecapOptions = {}): string {
  const { focalizer, order = "chrono", limit } = options;
  let beats = focalizer ? history.filter((beat) => beat.triggerId === focalizer) : [...history];
  if (order === "reverse") beats = beats.slice().reverse();
  if (limit != null && limit >= 0) {
    beats = order === "reverse" ? beats.slice(0, limit) : beats.slice(-limit);
  }
  if (!beats.length) return "";
  return beats.map((beat) => `**${beat.triggerId}.** ${beat.story}`.trim()).join("\n\n");
}
