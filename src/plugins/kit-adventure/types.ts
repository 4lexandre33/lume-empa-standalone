import type { Project } from "../narrative-engine/types.ts";

export interface AdventureKitService {
  id: "adventure";
  taxonomySource: string;
  rulesSource: string;
  applied(project: Project): boolean;
  apply(project: Project): Project;
}
