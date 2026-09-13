export type EntityId = string;

export type Entity = {
  id: EntityId;
  tags: Set<string>;
  stats: Record<string, number>;
  links: Record<string, EntityId>;
  extra?: Record<string, string>;
};

export type WorldModel = Map<EntityId, Entity>;

export type IssueSeverity = "error" | "warning";
export type IssueLocation = { file: string; line: number; column?: number; endColumn?: number };
export type Issue = { code: string; severity: IssueSeverity; message: string; location: IssueLocation };

export type MatcherSelector = { kind: "any" } | { kind: "trigger" } | { kind: "id"; id: EntityId };
export type MatcherValue =
  | { kind: "number"; value: number }
  | { kind: "id"; id: EntityId }
  | { kind: "trigger" }
  | { kind: "linkLookup"; entityId: EntityId; key: string };
export type Comparator = "=" | ">" | "<" | ">=" | "<=";
export type MatcherClause = { negated: boolean; key: string; op?: Comparator; value?: MatcherValue };
export type MatcherAST = { selector: MatcherSelector; clauses: MatcherClause[]; source: string };

export type ChangeTarget =
  | { kind: "id"; id: EntityId }
  | { kind: "trigger" }
  | { kind: "linkLookup"; entityId: EntityId; key: string };
export type ChangeField =
  | { kind: "addTag"; tag: string }
  | { kind: "removeTag"; tag: string }
  | { kind: "setStat"; key: string; value: number }
  | { kind: "deltaStat"; key: string; delta: number }
  | { kind: "deltaStatFrom"; key: string; sign: number; from: ChangeTarget; stat: string }
  | { kind: "mulStat"; key: string; factor: number }
  | { kind: "setLink"; key: string; value: ChangeTarget }
  | { kind: "createEntity"; entity: Entity }
  | { kind: "destroyEntity" };
export type ChangeAST = { target: ChangeTarget; fields: ChangeField[]; source: string; line?: number };

export type TokenKind =
  | "IDENT"
  | "NUMBER"
  | "DOT"
  | "EQ"
  | "GT"
  | "LT"
  | "GTE"
  | "LTE"
  | "BANG"
  | "STAR"
  | "DOLLAR"
  | "LPAREN"
  | "RPAREN"
  | "PLUS"
  | "MINUS"
  | "COLON"
  | "LBRACE"
  | "RBRACE"
  | "COMMA"
  | "SEMI"
  | "EOF";

export type Token = {
  kind: TokenKind;
  value: string;
  number?: number;
  line: number;
  column: number;
  index: number;
};

export const CATEGORY_TAGS = ["agent", "object", "place", "event", "information", "abstract"] as const;
export type CategoryTag = (typeof CATEGORY_TAGS)[number];
export const CATEGORY_LABEL: Record<CategoryTag, string> = {
  agent: "Agent",
  object: "Object",
  place: "Place",
  event: "Event",
  information: "Information",
  abstract: "Abstract",
};
export const BUILTIN_TAGS = [...CATEGORY_TAGS, "hidden"] as const;
export const VIEW_TAGS = new Set<string>(CATEGORY_TAGS);

export function isCategoryTag(tag: string): tag is CategoryTag {
  return (CATEGORY_TAGS as readonly string[]).includes(tag);
}

export function migrateLegacyTags(source: string): string {
  if (!source) return source;
  return source
    .replace(/\.character\b/g, ".agent")
    .replace(/\.item\b/g, ".object")
    .replace(/\.location\b/g, ".place")
    .replace(/!character\b/g, "!agent")
    .replace(/!item\b/g, "!object")
    .replace(/!location\b/g, "!place");
}
