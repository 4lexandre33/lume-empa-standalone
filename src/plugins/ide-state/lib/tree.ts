import { classifyRule } from "../../rule-semantics/lib/classify.ts";
import { CATEGORY_TAGS, primaryTag } from "../../narrative-engine/lib/index.ts";
import type { Entity, Rule, SidebarBucket, SidebarTree } from "../../narrative-engine/lib/index.ts";
import type { CompiledTaxonomy } from "../../narrative-engine/types.ts";

export const ENTITY_SECTIONS = [...CATEGORY_TAGS, "other"] as const;
export const RULE_SECTIONS = [
  "constraint",
  "transformation",
  "lifecycle",
  "relation",
  "cognition",
  "agency",
  "process",
  "other",
] as const;

export type EntitySection = (typeof ENTITY_SECTIONS)[number];
export type RuleSection = (typeof RULE_SECTIONS)[number];
export type TreeKind = "entities" | "rules";

export const ENTITY_SECTION_LABEL: Record<EntitySection, string> = {
  agent: "Agent",
  object: "Object",
  place: "Place",
  event: "Event",
  information: "Information",
  abstract: "Abstract",
  other: "Other",
};

export const RULE_SECTION_LABEL: Record<RuleSection, string> = {
  constraint: "Constraint",
  transformation: "Transformation",
  lifecycle: "Lifecycle",
  relation: "Relation",
  cognition: "Cognition",
  agency: "Agency",
  process: "Process",
  other: "Other",
};

export function emptyBucket(): SidebarBucket {
  return { folders: [], placements: {} };
}

export function emptyTree(): SidebarTree {
  return { entities: {}, rules: {} };
}

export function cloneTree(tree: SidebarTree | undefined): SidebarTree {
  const source = tree ?? emptyTree();
  const copy = (input: Record<string, SidebarBucket>): Record<string, SidebarBucket> =>
    Object.fromEntries(
      Object.entries(input).map(([key, bucket]) => [
        key,
        { folders: bucket.folders.map((folder) => ({ ...folder })), placements: { ...bucket.placements } },
      ]),
    );
  return { entities: copy(source.entities), rules: copy(source.rules) };
}

export function entitySection(entity: Entity, taxonomy?: CompiledTaxonomy | null): EntitySection {
  if (entity.id === "start") return "other";
  const tag = primaryTag(entity, taxonomy);
  if ((CATEGORY_TAGS as readonly string[]).includes(tag)) return tag as EntitySection;
  return "other";
}

export function ruleSection(rule: Rule): RuleSection {
  if (rule.semantics[0] && (RULE_SECTIONS as readonly string[]).includes(rule.semantics[0])) {
    return rule.semantics[0] as RuleSection;
  }
  const kinds = classifyRule(rule);
  const preferred = kinds.find((kind) => kind !== "constraint");
  const picked = preferred ?? kinds[0];
  if (picked && (RULE_SECTIONS as readonly string[]).includes(picked)) return picked as RuleSection;
  return "other";
}

export function entitiesBySection(
  world: Map<string, Entity>,
  taxonomy?: CompiledTaxonomy | null,
): Record<EntitySection, Entity[]> {
  const out = Object.fromEntries(ENTITY_SECTIONS.map((section) => [section, [] as Entity[]])) as Record<EntitySection, Entity[]>;
  for (const entity of world.values()) {
    if (entity.id === "start") continue;
    out[entitySection(entity, taxonomy)].push(entity);
  }
  return out;
}

export function rulesBySection(rules: readonly Rule[]): Record<RuleSection, Rule[]> {
  const out = Object.fromEntries(RULE_SECTIONS.map((section) => [section, [] as Rule[]])) as Record<RuleSection, Rule[]>;
  for (const rule of rules) out[ruleSection(rule)].push(rule);
  return out;
}

function bucketOf(tree: SidebarTree, kind: TreeKind, section: string): SidebarBucket {
  const current = tree[kind][section];
  if (current) return current;
  const created = emptyBucket();
  tree[kind][section] = created;
  return created;
}

export function addFolder(tree: SidebarTree | undefined, kind: TreeKind, section: string, name = "Nova pasta"): { tree: SidebarTree; id: string } {
  const next = cloneTree(tree);
  const bucket = bucketOf(next, kind, section);
  const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  bucket.folders.push({ id, name });
  return { tree: next, id };
}

export function renameFolder(tree: SidebarTree | undefined, kind: TreeKind, section: string, folderId: string, name: string): SidebarTree {
  const next = cloneTree(tree);
  const folder = bucketOf(next, kind, section).folders.find((item) => item.id === folderId);
  if (folder) folder.name = name.trim() || folder.name;
  return next;
}

export function deleteFolder(tree: SidebarTree | undefined, kind: TreeKind, section: string, folderId: string): SidebarTree {
  const next = cloneTree(tree);
  const bucket = bucketOf(next, kind, section);
  bucket.folders = bucket.folders.filter((folder) => folder.id !== folderId);
  for (const [itemId, placed] of Object.entries(bucket.placements)) {
    if (placed === folderId) delete bucket.placements[itemId];
  }
  return next;
}

export function placeItem(
  tree: SidebarTree | undefined,
  kind: TreeKind, section: string,
  itemId: string,
  folderId: string | null,
): SidebarTree {
  const next = cloneTree(tree);
  const bucket = bucketOf(next, kind, section);
  if (!folderId || !bucket.folders.some((folder) => folder.id === folderId)) {
    delete bucket.placements[itemId];
  } else {
    bucket.placements[itemId] = folderId;
  }
  return next;
}
