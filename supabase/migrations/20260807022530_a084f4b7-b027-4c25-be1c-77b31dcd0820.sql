-- 1) Trigger-only function must not be callable by API roles
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) Sensitive org functions: authenticated-only (no anon), remove PUBLIC grants
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_org_members(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_organization_with_owner(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text) TO authenticated;

-- 3) Constrain invite roles at the data level (no owner escalation)
ALTER TABLE public.organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_role_check;
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_role_check
  CHECK (role IN ('member', 'admin'));

-- 4) Harden redemption: validated SECURITY DEFINER path only
CREATE OR REPLACE FUNCTION public.redeem_invite(invite_code text)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  invite public.organization_invites;
  org public.organizations;
  safe_role text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if invite_code is null or length(trim(invite_code)) < 8 or length(invite_code) > 200 then
    raise exception 'رابط الدعوة غير صالح أو مستخدم مسبقًا';
  end if;

  select * into invite
  from public.organization_invites
  where code = invite_code and is_active = true and used_by is null
  limit 1;

  if invite is null then
    raise exception 'رابط الدعوة غير صالح أو مستخدم مسبقًا';
  end if;

  -- never allow privilege escalation to owner through an invite link
  safe_role := case when invite.role = 'admin' then 'admin' else 'member' end;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'أنت عضو بالفعل في مكتب آخر';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite.organization_id, auth.uid(), safe_role);

  update public.organization_invites
  set is_active = false, used_by = auth.uid(), used_at = now()
  where id = invite.id;

  select * into org from public.organizations where id = invite.organization_id;
  return org;
end;
$function$;

-- 5) Membership rows are never writable directly from the API;
-- creation happens only through the validated SECURITY DEFINER paths above.
REVOKE INSERT, UPDATE, DELETE ON public.organization_members FROM anon, authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
