import { makeIssue } from "./lexer.ts";
import { compileRuleFile, type Rule } from "./rule-engine.ts";
import { parsePadrao, type SiftPattern } from "./sift.ts";
import { compileTaxonomy, effectiveTags, type CompiledTaxonomy } from "./taxonomy.ts";
import { attachEntityExtras, compileEntityFile, preprocessEntityFile } from "./world-model.ts";
import { migrateLegacyTags, VIEW_TAGS, type Issue, type WorldModel } from "./types.ts";
import { validateWorld } from "./world-index.ts";

export const CURRENT_FORMAT_VERSION = 2;

export type ProjectMeta = { id: string; name: string; version: number; createdAt: string; updatedAt: string };
export type SidebarFolder = { id: string; name: string };
export type SidebarBucket = { folders: SidebarFolder[]; placements: Record<string, string> };
export type SidebarTree = {
  entities: Record<string, SidebarBucket>;
  rules: Record<string, SidebarBucket>;
};
export type ProjectSettings = { playerEntityId: string; debug: boolean; tree?: SidebarTree };
export type Project = {
  formatVersion: number;
  meta: ProjectMeta;
  entitiesSource: string;
  taxonomySource: string;
  rulesSource: string;
  notebooksSource: string;
  extras: Record<string, Record<string, string>>;
  settings: ProjectSettings;
};
export type ProjectIndexEntry = { id: string; name: string; updatedAt: string };
export type CompileProjectResult = {
  worldModel: WorldModel;
  rules: Rule[];
  patterns: SiftPattern[];
  taxonomy: CompiledTaxonomy;
  errors: Issue[];
  warnings: Issue[];
};
export type WireProject = Project;

export const BLANK_ENTITIES = `JOGADOR.{
tags: agent;
stats: ;
links: current_location=SALA;
}

SALA.{
tags: place;
stats: ;
links: ;
name: Sala;
description: Uma sala vazia. A história começa aqui.
}

start()
`;

export const BLANK_RULES = `# start
ON: start
narrativa: "Uma sala vazia. A história começa aqui."
`;

export const BLANK_TAXONOMY = "";
export const BLANK_NOTEBOOKS = "";

export function nowIso(): string {
  return new Date().toISOString();
}
export function newProjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneProject(project: Project): Project {
  return {
    formatVersion: project.formatVersion,
    meta: { ...project.meta },
    entitiesSource: project.entitiesSource,
    taxonomySource: project.taxonomySource,
    rulesSource: project.rulesSource,
    notebooksSource: project.notebooksSource,
    extras: Object.fromEntries(Object.entries(project.extras).map(([k, v]) => [k, { ...v }])),
    settings: cloneSettings(project.settings),
  };
}

function cloneBucket(bucket: SidebarBucket): SidebarBucket {
  return {
    folders: bucket.folders.map((folder) => ({ ...folder })),
    placements: { ...bucket.placements },
  };
}

function cloneTree(tree: SidebarTree): SidebarTree {
  const copy = (input: Record<string, SidebarBucket>): Record<string, SidebarBucket> =>
    Object.fromEntries(Object.entries(input).map(([key, bucket]) => [key, cloneBucket(bucket)]));
  return { entities: copy(tree.entities), rules: copy(tree.rules) };
}

function cloneSettings(settings: ProjectSettings): ProjectSettings {
  return {
    playerEntityId: settings.playerEntityId,
    debug: settings.debug,
    tree: settings.tree ? cloneTree(settings.tree) : undefined,
  };
}

function coerceBucket(raw: unknown): SidebarBucket {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const foldersIn = Array.isArray(value.folders) ? value.folders : [];
  const folders: SidebarFolder[] = [];
  for (const item of foldersIn) {
    if (!item || typeof item !== "object") continue;
    const folder = item as Record<string, unknown>;
    if (typeof folder.id !== "string" || !folder.id) continue;
    folders.push({ id: folder.id, name: typeof folder.name === "string" && folder.name.trim() ? folder.name : "Pasta" });
  }
  const placements: Record<string, string> = {};
  if (value.placements && typeof value.placements === "object") {
    for (const [id, folderId] of Object.entries(value.placements as Record<string, unknown>)) {
      if (typeof folderId === "string" && folderId) placements[id] = folderId;
    }
  }
  return { folders, placements };
}

function coerceBuckets(raw: unknown): Record<string, SidebarBucket> {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, bucket]) => [key, coerceBucket(bucket)]));
}

function coerceTree(raw: unknown): SidebarTree | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  return { entities: coerceBuckets(value.entities), rules: coerceBuckets(value.rules) };
}

export function createProject(
  name: string,
  seed?: Partial<Pick<Project, "entitiesSource" | "taxonomySource" | "rulesSource" | "notebooksSource" | "extras" | "settings">> & { id?: string },
): Project {
  const createdAt = nowIso();
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    meta: { id: seed?.id ?? newProjectId(), name, version: 1, createdAt, updatedAt: createdAt },
    entitiesSource: seed?.entitiesSource ?? BLANK_ENTITIES,
    taxonomySource: seed?.taxonomySource ?? BLANK_TAXONOMY,
    rulesSource: seed?.rulesSource ?? BLANK_RULES,
    notebooksSource: seed?.notebooksSource ?? BLANK_NOTEBOOKS,
    extras: seed?.extras ? { ...seed.extras } : {},
    settings: {
      playerEntityId: seed?.settings?.playerEntityId ?? "JOGADOR",
      debug: seed?.settings?.debug ?? true,
      tree: seed?.settings?.tree ? cloneTree(seed.settings.tree) : undefined,
    },
  };
}

export function compileProject(project: Project): CompileProjectResult {
  const entities = compileEntityFile(migrateLegacyTags(project.entitiesSource));
  const worldModel = attachEntityExtras(entities.worldModel, project.extras ?? {});
  const taxonomy = compileTaxonomy(project.taxonomySource ?? "");
  const compiledRules = compileRuleFile(migrateLegacyTags(project.rulesSource), worldModel, taxonomy);
  return {
    worldModel,
    rules: compiledRules.rules,
    patterns: parsePadrao(project.rulesSource),
    taxonomy,
    errors: [...entities.errors, ...compiledRules.errors],
    warnings: [...entities.warnings, ...compiledRules.warnings],
  };
}

export function diagnose(project: Project): { compiled: CompileProjectResult; issues: Issue[] } {
  const compiled = compileProject(project);
  const issues = [...compiled.errors, ...compiled.warnings, ...compiled.taxonomy.errors, ...compiled.taxonomy.warnings];
  const referenced = new Set<string>([project.settings.playerEntityId, "start"]);
  for (const e of compiled.worldModel.values()) {
    for (const tag of effectiveTags(e.tags, compiled.taxonomy)) if (VIEW_TAGS.has(tag)) referenced.add(e.id);
    for (const t of Object.values(e.links)) referenced.add(t);
  }
  for (const entity of compiled.worldModel.values()) {
    if (referenced.has(entity.id)) continue;
    issues.push(makeIssue("W003", "warning", { id: entity.id }, { file: "entities", line: 1, column: 1 }));
  }
  issues.push(...validateWorld(compiled.worldModel, compiled.rules, compiled.taxonomy));
  return { compiled, issues };
}

export function fingerprintProject(project: Project): string {
  return `${project.entitiesSource.length}:${project.taxonomySource.length}:${project.rulesSource.length}:${project.notebooksSource.length}:${project.meta.updatedAt}:${project.meta.name}`;
}

export function coerceProject(raw: unknown): Project {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const meta = (p.meta && typeof p.meta === "object" ? p.meta : p) as Record<string, unknown>;
  const createdAt = typeof meta.createdAt === "string" ? meta.createdAt : nowIso();
  const extrasIn = p.extras && typeof p.extras === "object" ? (p.extras as Record<string, Record<string, string>>) : {};
  const settings = (p.settings && typeof p.settings === "object" ? p.settings : {}) as Record<string, unknown>;
  return {
    formatVersion: typeof p.formatVersion === "number" ? p.formatVersion : CURRENT_FORMAT_VERSION,
    meta: {
      id: typeof meta.id === "string" && meta.id ? meta.id : newProjectId(),
      name: typeof meta.name === "string" && meta.name ? meta.name : "Sem nome",
      version: typeof meta.version === "number" ? meta.version : 1,
      createdAt,
      updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : createdAt,
    },
    entitiesSource: migrateLegacyTags(typeof p.entitiesSource === "string" ? p.entitiesSource : BLANK_ENTITIES),
    taxonomySource: typeof p.taxonomySource === "string" ? p.taxonomySource : BLANK_TAXONOMY,
    rulesSource: migrateLegacyTags(typeof p.rulesSource === "string" ? p.rulesSource : BLANK_RULES),
    notebooksSource: typeof p.notebooksSource === "string" ? p.notebooksSource : BLANK_NOTEBOOKS,
    extras: extrasIn,
    settings: {
      playerEntityId: typeof settings.playerEntityId === "string" ? settings.playerEntityId : "JOGADOR",
      debug: settings.debug !== false,
      tree: coerceTree(settings.tree),
    },
  };
}

/** Maps a lume_projects SQL row (snake_case) onto Project. Missing taxonomy_source = empty notebook. */
export function projectFromCloudRow(row: Record<string, unknown>): Project {
  return coerceProject({
    formatVersion: row.format_version,
    meta: {
      id: row.id,
      name: row.name,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    entitiesSource: row.entities_source,
    taxonomySource: row.taxonomy_source,
    rulesSource: row.rules_source,
    notebooksSource: row.notebooks_source,
    extras: row.extras,
    settings: row.settings,
  });
}

export function toWireProject(project: Project): WireProject {
  return cloneProject(project);
}

export function underlinesFor(issues: Issue[], file: string): Map<number, { start: number; end: number; severity: Issue["severity"] }[]> {
  const map = new Map<number, { start: number; end: number; severity: Issue["severity"] }[]>();
  for (const issue of issues) {
    if (issue.location.file !== file) continue;
    const list = map.get(issue.location.line) ?? [];
    list.push({ start: (issue.location.column ?? 1) - 1, end: (issue.location.endColumn ?? (issue.location.column ?? 1) + 4) - 1, severity: issue.severity });
    map.set(issue.location.line, list);
  }
  return map;
}

export { preprocessEntityFile };
