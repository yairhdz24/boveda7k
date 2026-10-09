-- Bóveda — desbloqueo biométrico
-- Cada fila es la MISMA llave de datos (DEK) envuelta con una llave derivada del
-- secreto PRF de una passkey. Sin el dispositivo y su biometría, la fila no sirve de nada.

create table public.vault_passkeys (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credential_id  text not null,                     -- base64url, id de la passkey
  prf_salt       text not null,                     -- base64, 32 bytes
  wrapped_key    text not null,                     -- base64 (DEK envuelta con AES-GCM)
  wrap_iv        text not null,                     -- base64
  label          text not null check (char_length(label) between 1 and 80),
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz,
  unique (owner_id, credential_id)                  -- por usuario: no revela passkeys ajenas
);

alter table public.vault_passkeys enable row level security;

create policy "own passkeys" on public.vault_passkeys for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
