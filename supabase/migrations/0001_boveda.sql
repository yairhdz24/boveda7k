-- Bóveda — esquema inicial
-- Todo secreto llega YA CIFRADO desde el navegador (AES-256-GCM). La base nunca ve texto plano.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Llave de la bóveda: la llave de datos (DEK) envuelta con la
-- llave derivada de la contraseña maestra (PBKDF2-SHA256).
-- ─────────────────────────────────────────────────────────────
create table public.vault_keys (
  owner_id        uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  kdf             text        not null default 'PBKDF2-SHA256',
  kdf_salt        text        not null,           -- base64
  kdf_iterations  integer     not null check (kdf_iterations >= 300000),
  wrapped_key     text        not null,           -- base64 (DEK envuelta con AES-GCM)
  wrap_iv         text        not null,           -- base64
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  website_url  text,
  logo_url     text,
  notes        text,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  logo_url     text,
  category     text,
  kind         text not null default 'login' check (kind in ('login','database','server','api','email','other')),
  login_url    text,
  created_at   timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.credentials (
  id               uuid primary key,                -- lo genera el cliente: se usa como AAD del cifrado
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  service_id       uuid references public.services(id) on delete set null,
  title            text not null check (char_length(title) between 1 and 120),
  environment      text not null default 'prod' check (environment in ('prod','staging','dev')),
  login_url        text,
  payload          jsonb not null,                  -- { v, iv, ct } — campos, usuario, contraseña, tokens y notas cifrados
  last_rotated_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint payload_shape check (payload ? 'iv' and payload ? 'ct')
);

create index on public.clients (owner_id, name);
create index on public.services (owner_id, name);
create index on public.credentials (owner_id, client_id);
create index on public.credentials (service_id);

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger vault_keys_touch  before update on public.vault_keys  for each row execute function public.touch_updated_at();
create trigger clients_touch     before update on public.clients     for each row execute function public.touch_updated_at();
create trigger credentials_touch before update on public.credentials for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS: cada usuario solo ve y toca lo suyo.
-- ─────────────────────────────────────────────────────────────
alter table public.vault_keys  enable row level security;
alter table public.clients     enable row level security;
alter table public.services    enable row level security;
alter table public.credentials enable row level security;

create policy "own vault key"   on public.vault_keys  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own clients"     on public.clients     for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own services"    on public.services    for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own credentials" on public.credentials for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );

-- Vista con conteo de credenciales por cliente (respeta RLS del invocador)
create view public.clients_with_counts with (security_invoker = true) as
  select c.*, (select count(*) from public.credentials k where k.client_id = c.id)::int as credential_count
  from public.clients c;

-- ─────────────────────────────────────────────────────────────
-- Storage: logos de clientes y servicios (no son secretos).
-- Ruta: logos/<uid>/<archivo>
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif'])
on conflict (id) do nothing;

create policy "logos: leer los propios" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "logos: subir a su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "logos: actualizar los propios" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "logos: borrar los propios" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
