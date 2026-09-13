import type { Project } from "../narrative-engine/types.ts";
import type { RelationCategory } from "./data/relations.ts";

export interface SocialKitService {
  id: "social";
  taxonomySource: string;
  rulesSource: string;
  categories: readonly RelationCategory[];
  applied(project: Project): boolean;
  apply(project: Project): Project;
}
