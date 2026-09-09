-- Caderno de taxonomia (filho → pai). Linhas antigas ficam vazias = motor antigo.
alter table lume_projects
  add column if not exists taxonomy_source text not null default '';
