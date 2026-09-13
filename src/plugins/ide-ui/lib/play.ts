export type PlayHud = {
  title: string;
  turn: number;
  score: number | null;
};

export function playHud(
  title: string,
  historyLength: number,
  stats: Record<string, number> | undefined,
): PlayHud {
  const score = stats && typeof stats.score === "number" ? stats.score : null;
  return { title, turn: Math.max(0, historyLength - 1), score };
}
