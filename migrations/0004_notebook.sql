-- Caderno humano (C1). Linhas antigas ficam vazias = motor antigo.
alter table lume_projects
  add column if not exists notebooks_source text not null default '';
