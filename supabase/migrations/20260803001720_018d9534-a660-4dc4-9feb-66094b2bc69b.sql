create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'basic' check (plan in ('basic', 'professional', 'enterprise')),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index organization_members_organization_id_idx on public.organization_members(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;

grant select, update on public.organizations to authenticated;

create policy "الأعضاء يرون مكتبهم"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

create policy "المالك أو المدير يعدّل بيانات المكتب"
  on public.organizations for update
  to authenticated
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

grant select on public.organization_members to authenticated;

create policy "الأعضاء يرون زملاءهم في نفس المكتب"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(organization_id));

create or replace function public.create_organization_with_owner(org_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if trim(org_name) = '' then
    raise exception 'اسم المكتب مطلوب';
  end if;

  insert into public.organizations (name)
  values (trim(org_name))
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

grant execute on function public.create_organization_with_owner(text) to authenticated;