import type { Project } from "../narrative-engine/types.ts";
import type { ChannelKind } from "./data/channels.ts";

export interface ChannelKitService {
  id: "channel";
  taxonomySource: string;
  rulesSource: string;
  kinds: readonly ChannelKind[];
  applied(project: Project): boolean;
  apply(project: Project): Project;
}
