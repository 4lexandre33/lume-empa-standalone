import type { GameState } from "../narrative-engine/types.ts";

export interface WorldEventsService {
  emit(game: GameState, eventId: string, triggerId?: string): GameState;
}
