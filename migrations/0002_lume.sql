-- Histórias e preferências da IDE Lume (sem contas: linhas sem dono).
create table if not exists lume_projects (
  id text primary key,
  name text not null,
  version integer not null default 1,
  format_version integer not null default 1,
  entities_source text not null default '',
  rules_source text not null default '',
  extras jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lume_playtests (
  project_id text primary key references lume_projects(id) on delete cascade,
  snapshot jsonb not null,
  saved_at timestamptz not null default now()
);

create table if not exists lume_settings (
  id text primary key,
  payload jsonb not null default '{}'::jsonb
);
