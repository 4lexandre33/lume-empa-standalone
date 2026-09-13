/**
 * Project Cloud Persistence Engine
 */

import { getSql, type Sql } from '../../../db/db.ts';
import {
  coerceProject,
  CURRENT_FORMAT_VERSION,
  projectFromCloudRow,
  type Project,
  type ProjectIndexEntry,
  type WireProject
} from '../../narrative-engine/lib/project.ts';
import type { IdeSettings, PlaytestSnapshotRecord } from '../types.ts';

export const DEFAULT_IDE_SETTINGS: IdeSettings = {
  locale: 'pt',
  onboarding: 'pending',
  layout: { left: 22, right: 28, bottom: 22 }
};

function asIso(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return new Date().toISOString();
}

/**
 * List all projects from the database
 */
export async function listProjects(customSql?: Sql): Promise<ProjectIndexEntry[]> {
  const sql = customSql ?? (await getSql());
  const rows = await sql<{ id: string; name: string; updated_at: string }>`
    select id, name, updated_at::text as updated_at from lume_projects order by updated_at desc
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: asIso(r.updated_at) }));
}

/**
 * Load a single project by ID from the database
 */
export async function loadProject(id: string, customSql?: Sql): Promise<Project | null> {
  const sql = customSql ?? (await getSql());
  const rows = await sql<Record<string, unknown>>`
    select id, name, version, format_version, entities_source, taxonomy_source, rules_source, notebooks_source, extras, settings,
           created_at::text as created_at, updated_at::text as updated_at
    from lume_projects where id = ${id} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return projectFromCloudRow(row);
}

/**
 * Save / Upsert a project in the database
 */
export async function saveProject(project: WireProject | Project, customSql?: Sql): Promise<ProjectIndexEntry> {
  const sql = customSql ?? (await getSql());
  const p = coerceProject(project);
  p.formatVersion = CURRENT_FORMAT_VERSION;
  p.meta.updatedAt = new Date().toISOString();

  await sql`
    insert into lume_projects (id, name, version, format_version, entities_source, taxonomy_source, rules_source, notebooks_source, extras, settings, created_at, updated_at)
    values (
      ${p.meta.id}, ${p.meta.name}, ${p.meta.version}, ${p.formatVersion},
      ${p.entitiesSource}, ${p.taxonomySource}, ${p.rulesSource}, ${p.notebooksSource}, ${JSON.stringify(p.extras)}::jsonb, ${JSON.stringify(p.settings)}::jsonb,
      ${p.meta.createdAt}::timestamptz, ${p.meta.updatedAt}::timestamptz
    )
    on conflict (id) do update set
      name = excluded.name,
      version = excluded.version,
      format_version = excluded.format_version,
      entities_source = excluded.entities_source,
      taxonomy_source = excluded.taxonomy_source,
      rules_source = excluded.rules_source,
      notebooks_source = excluded.notebooks_source,
      extras = excluded.extras,
      settings = excluded.settings,
      updated_at = excluded.updated_at
  `;

  return { id: p.meta.id, name: p.meta.name, updatedAt: p.meta.updatedAt };
}

/**
 * Delete a project by ID
 */
export async function deleteProject(id: string, customSql?: Sql): Promise<{ ok: boolean }> {
  const sql = customSql ?? (await getSql());
  await sql`delete from lume_projects where id = ${id}`;
  return { ok: true };
}

/**
 * Save a playtest snapshot for a project
 */
export async function savePlaytest(projectId: string, snapshot: unknown, customSql?: Sql): Promise<{ ok: boolean; savedAt: string }> {
  const sql = customSql ?? (await getSql());
  const savedAt = new Date().toISOString();
  await sql`
    insert into lume_playtests (project_id, snapshot, saved_at)
    values (${projectId}, ${JSON.stringify(snapshot)}::jsonb, ${savedAt}::timestamptz)
    on conflict (project_id) do update set
      snapshot = excluded.snapshot,
      saved_at = excluded.saved_at
  `;
  return { ok: true, savedAt };
}

/**
 * Load a playtest snapshot for a project
 */
export async function loadPlaytest(projectId: string, customSql?: Sql): Promise<PlaytestSnapshotRecord | null> {
  const sql = customSql ?? (await getSql());
  const rows = await sql<{ project_id: string; snapshot: unknown; saved_at: string }>`
    select project_id, snapshot, saved_at::text as saved_at
    from lume_playtests where project_id = ${projectId} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    projectId: row.project_id,
    snapshot: typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot,
    savedAt: asIso(row.saved_at)
  };
}

/**
 * Delete a playtest snapshot for a project
 */
export async function deletePlaytest(projectId: string, customSql?: Sql): Promise<{ ok: boolean }> {
  const sql = customSql ?? (await getSql());
  await sql`delete from lume_playtests where project_id = ${projectId}`;
  return { ok: true };
}

/**
 * Load IDE settings
 */
export async function loadSettings(customSql?: Sql): Promise<IdeSettings> {
  const sql = customSql ?? (await getSql());
  const rows = await sql<{ payload: IdeSettings }>`select payload from lume_settings where id = ${'ide'} limit 1`;
  const payload = rows[0]?.payload;
  if (!payload) return DEFAULT_IDE_SETTINGS;
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  return {
    ...DEFAULT_IDE_SETTINGS,
    ...parsed,
    layout: { ...DEFAULT_IDE_SETTINGS.layout, ...parsed.layout }
  };
}

/**
 * Save IDE settings
 */
export async function saveSettings(settings: IdeSettings, customSql?: Sql): Promise<IdeSettings> {
  const sql = customSql ?? (await getSql());
  await sql`
    insert into lume_settings (id, payload) values (${'ide'}, ${JSON.stringify(settings)}::jsonb)
    on conflict (id) do update set payload = excluded.payload
  `;
  return settings;
}
