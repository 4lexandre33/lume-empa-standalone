import type { Rule, SemanticKind } from "../narrative-engine/types.ts";

export type { SemanticKind };

export interface RuleSemanticsService {
  kinds: readonly SemanticKind[];
  classify(rule: Rule): SemanticKind[];
}
