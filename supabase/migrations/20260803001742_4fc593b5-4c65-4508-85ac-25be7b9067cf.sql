revoke execute on function public.is_org_member(uuid) from anon, public;
revoke execute on function public.create_organization_with_owner(text) from anon, public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.create_organization_with_owner(text) to authenticated;