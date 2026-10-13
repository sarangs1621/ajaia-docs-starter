-- Ajaia Docs schema. Run this once in the Supabase SQL editor.
-- Supabase Auth owns users; profiles mirror safe display metadata for sharing.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled document' check (char_length(title) between 1 and 120),
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_shares (
  document_id uuid not null references public.documents(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null default 'editor' check (permission in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, shared_with_id)
);

create index if not exists documents_owner_updated_idx on public.documents(owner_id, updated_at desc);
create index if not exists document_shares_user_idx on public.document_shares(shared_with_id);

-- SECURITY DEFINER helper functions avoid recursive RLS checks between documents and shares.
create or replace function public.is_document_owner(p_document_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.owner_id = auth.uid()
  );
$$;

create or replace function public.has_document_access(p_document_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d where d.id = p_document_id and d.owner_id = auth.uid()
  ) or exists (
    select 1 from public.document_shares s where s.document_id = p_document_id and s.shared_with_id = auth.uid()
  );
$$;

create or replace function public.can_edit_document(p_document_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d where d.id = p_document_id and d.owner_id = auth.uid()
  ) or exists (
    select 1 from public.document_shares s
    where s.document_id = p_document_id and s.shared_with_id = auth.uid() and s.permission = 'editor'
  );
$$;

-- Automatically create a profile when a Supabase Auth account is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at before update on public.documents
for each row execute function public.touch_updated_at();

-- Prevent ownership transfer through an ordinary document update.
create or replace function public.prevent_document_owner_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Document ownership cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_prevent_owner_change on public.documents;
create trigger documents_prevent_owner_change before update on public.documents
for each row execute function public.prevent_document_owner_change();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Owners and collaborators can read documents" on public.documents;
create policy "Owners and collaborators can read documents" on public.documents for select
using (owner_id = auth.uid() or public.has_document_access(id));
drop policy if exists "Owners can create documents" on public.documents;
create policy "Owners can create documents" on public.documents for insert with check (owner_id = auth.uid());
drop policy if exists "Owners and editors can update documents" on public.documents;
create policy "Owners and editors can update documents" on public.documents for update
using (public.can_edit_document(id)) with check (public.can_edit_document(id));
drop policy if exists "Owners can delete documents" on public.documents;
create policy "Owners can delete documents" on public.documents for delete using (public.is_document_owner(id));

drop policy if exists "Owners and recipients can read shares" on public.document_shares;
create policy "Owners and recipients can read shares" on public.document_shares for select
using (shared_with_id = auth.uid() or public.is_document_owner(document_id));
drop policy if exists "Owners can grant access" on public.document_shares;
create policy "Owners can grant access" on public.document_shares for insert
with check (public.is_document_owner(document_id));
drop policy if exists "Owners can update access" on public.document_shares;
create policy "Owners can update access" on public.document_shares for update
using (public.is_document_owner(document_id)) with check (public.is_document_owner(document_id));
drop policy if exists "Owners can revoke access" on public.document_shares;
create policy "Owners can revoke access" on public.document_shares for delete using (public.is_document_owner(document_id));

-- Lookup by email happens server-side so the UI does not need directory-wide profile access.
create or replace function public.share_document_by_email(
  p_document_id uuid, p_email text, p_permission text default 'editor'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to share a document'; end if;
  if not public.is_document_owner(p_document_id) then raise exception 'Only the document owner can share it'; end if;
  if p_permission not in ('viewer', 'editor') then raise exception 'Permission must be viewer or editor'; end if;
  select * into target_profile from public.profiles where lower(email) = lower(trim(p_email));
  if target_profile.id is null then raise exception 'No account exists for this email'; end if;
  if target_profile.id = auth.uid() then raise exception 'You already own this document'; end if;
  insert into public.document_shares (document_id, shared_with_id, permission)
  values (p_document_id, target_profile.id, p_permission)
  on conflict (document_id, shared_with_id) do update set permission = excluded.permission;
  return jsonb_build_object('email', target_profile.email, 'display_name', target_profile.display_name, 'permission', p_permission);
end;
$$;

create or replace function public.list_document_shares(p_document_id uuid)
returns table (id uuid, email text, display_name text, permission text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_document_owner(p_document_id) then
    raise exception 'Only the document owner can view its access list';
  end if;
  return query
    select p.id, p.email, p.display_name, s.permission, s.created_at
    from public.document_shares s join public.profiles p on p.id = s.shared_with_id
    where s.document_id = p_document_id order by s.created_at asc;
end;
$$;

create or replace function public.revoke_document_share_by_email(p_document_id uuid, p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  rows_deleted integer;
begin
  if auth.uid() is null or not public.is_document_owner(p_document_id) then
    raise exception 'Only the document owner can revoke access';
  end if;
  delete from public.document_shares s using public.profiles p
  where s.document_id = p_document_id and s.shared_with_id = p.id and lower(p.email) = lower(trim(p_email));
  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;

-- Explicit API grants: RLS filters rows only after SQL privileges permit the operation.
grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.document_shares to authenticated;

-- SECURITY DEFINER functions must not inherit the default EXECUTE grant to PUBLIC/anon.
revoke all on function public.is_document_owner(uuid) from public, anon;
revoke all on function public.has_document_access(uuid) from public, anon;
revoke all on function public.can_edit_document(uuid) from public, anon;
revoke all on function public.share_document_by_email(uuid, text, text) from public, anon;
revoke all on function public.list_document_shares(uuid) from public, anon;
revoke all on function public.revoke_document_share_by_email(uuid, text) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_document_owner_change() from public, anon, authenticated;

grant execute on function public.is_document_owner(uuid) to authenticated;
grant execute on function public.has_document_access(uuid) to authenticated;
grant execute on function public.can_edit_document(uuid) to authenticated;
grant execute on function public.share_document_by_email(uuid, text, text) to authenticated;
grant execute on function public.list_document_shares(uuid) to authenticated;
grant execute on function public.revoke_document_share_by_email(uuid, text) to authenticated;
