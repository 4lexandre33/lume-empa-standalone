import type { DryRunEngine, DryRunService } from "../types.ts";

export function bindDryRun(engine: DryRunEngine): DryRunService {
  return {
    dryRun: (state, triggerId) => engine.dryRun(state, triggerId),
    diffWorlds: (before, after) => engine.diffWorlds(before, after),
  };
}
