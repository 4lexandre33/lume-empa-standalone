import type { Project } from "../narrative-engine/types.ts";
import type { CombatTag } from "./data/combat.ts";

export interface CombatKitService {
  id: "combat";
  taxonomySource: string;
  rulesSource: string;
  tags: readonly CombatTag[];
  applied(project: Project): boolean;
  apply(project: Project): Project;
}
