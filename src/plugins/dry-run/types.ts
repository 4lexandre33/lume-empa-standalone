import type {
  ChangeAST,
  DryRunCandidate,
  DryRunReport,
  EffectOp,
  EntityDiff,
  GameState,
  WorldDiff,
  WorldModel,
} from "../narrative-engine/types.ts";

export type {
  ChangeAST,
  DryRunCandidate,
  DryRunReport,
  EffectOp,
  EntityDiff,
  GameState,
  WorldDiff,
  WorldModel,
};

export type DryRunEngine = {
  dryRun(state: GameState, triggerId: string): DryRunReport;
  diffWorlds(before: WorldModel, after: WorldModel): WorldDiff;
};

export interface DryRunService {
  dryRun(state: GameState, triggerId: string): DryRunReport;
  diffWorlds(before: WorldModel, after: WorldModel): WorldDiff;
}
