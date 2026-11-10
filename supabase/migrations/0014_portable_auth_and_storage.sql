-- Portable authentication and storage for non-Supabase PostgreSQL hosts.
--
-- The Neon/standalone database keeps the same public schema as Supabase, but
-- auth.users is a plain table (no GoTrue) and files are stored in
-- public.fund_storage instead of Supabase Storage. This migration makes the
-- plain auth.users table behave like the parts the API relies on.

-- New accounts need a generated id (Supabase's auth.users has this default).
alter table auth.users alter column id set default gen_random_uuid();

-- Keep updated_at fresh for password/email changes made through the API.
create or replace function auth.fund_touch_user()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

drop trigger if exists trg_touch_auth_user on auth.users;
create trigger trg_touch_auth_user
  before update on auth.users
  for each row execute function auth.fund_touch_user();

-- Supabase creates this trigger in its own auth schema migration; the portable
-- dump only carries the function. Recreate it so every new account gets a
-- fund_user_profiles row (first account becomes the active admin).
drop trigger if exists trg_bootstrap_user_profile on auth.users;
create trigger trg_bootstrap_user_profile
  after insert on auth.users
  for each row execute function public.fund_bootstrap_profile();

-- File storage used by receipts, expense attachments and the fund logo.
create table if not exists public.fund_storage (
  bucket text not null,
  path text not null,
  mime_type text,
  size_bytes integer not null default 0,
  data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket, path)
);

-- Only the API (service role / direct connection) touches this table.
alter table public.fund_storage enable row level security;
revoke all on public.fund_storage from anon, authenticated;

-- Backup snapshots are stored in the same table under the fund-backups bucket.
create index if not exists fund_storage_bucket_created_idx
  on public.fund_storage (bucket, created_at desc);
