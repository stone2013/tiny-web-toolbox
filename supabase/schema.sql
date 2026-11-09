-- Tiny Web Toolbox: account history and encrypted password vault
-- Run this script in Supabase SQL Editor.
-- Password values are encrypted in the browser before they reach this database.

create table if not exists public.tool_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null check (char_length(tool_id) between 1 and 64),
  action text not null default 'used' check (char_length(action) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists tool_history_user_created_idx
  on public.tool_history (user_id, created_at desc);

create table if not exists public.vault_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kdf_salt text not null,
  check_iv text not null,
  check_ciphertext text not null,
  kdf_iterations integer not null default 600000 check (kdf_iterations >= 300000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  encrypted_payload text not null,
  iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_items_user_created_idx
  on public.vault_items (user_id, created_at desc);

create or replace function public.twt_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vault_settings_set_updated_at on public.vault_settings;
create trigger vault_settings_set_updated_at
before update on public.vault_settings
for each row execute function public.twt_set_updated_at();

drop trigger if exists vault_items_set_updated_at on public.vault_items;
create trigger vault_items_set_updated_at
before update on public.vault_items
for each row execute function public.twt_set_updated_at();

alter table public.tool_history enable row level security;
alter table public.vault_settings enable row level security;
alter table public.vault_items enable row level security;

drop policy if exists "Users can read their own history" on public.tool_history;
create policy "Users can read their own history"
on public.tool_history for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own history" on public.tool_history;
create policy "Users can add their own history"
on public.tool_history for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own history" on public.tool_history;
create policy "Users can delete their own history"
on public.tool_history for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own vault settings" on public.vault_settings;
create policy "Users can read their own vault settings"
on public.vault_settings for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own vault settings" on public.vault_settings;
create policy "Users can create their own vault settings"
on public.vault_settings for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own vault settings" on public.vault_settings;
create policy "Users can update their own vault settings"
on public.vault_settings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own vault items" on public.vault_items;
create policy "Users can read their own vault items"
on public.vault_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own vault items" on public.vault_items;
create policy "Users can create their own vault items"
on public.vault_items for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own vault items" on public.vault_items;
create policy "Users can update their own vault items"
on public.vault_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own vault items" on public.vault_items;
create policy "Users can delete their own vault items"
on public.vault_items for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.tool_history to authenticated;
grant select, insert, update on public.vault_settings to authenticated;
grant select, insert, update, delete on public.vault_items to authenticated;

comment on table public.tool_history is
  'Minimal usage history only. Never store tool input, generated passwords, or other sensitive content here.';
comment on table public.vault_settings is
  'Client-side key derivation salt and encrypted unlock-check value. Never stores the master password or plaintext key.';
comment on table public.vault_items is
  'Password vault records encrypted in the browser using AES-GCM before upload.';
