REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM authenticated, anon, PUBLIC;

CREATE OR REPLACE FUNCTION public.list_job_runs()
 RETURNS TABLE(runid bigint, jobid bigint, job_name text, status text, return_message text, start_time timestamp with time zone, end_time timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    r.runid,
    r.jobid,
    j.jobname as job_name,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
  from cron.job_run_details r
  join cron.job j on j.jobid = r.jobid
  where exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  )
  order by r.start_time desc nulls last
  limit 50;
$function$;

REVOKE ALL ON FUNCTION public.list_job_runs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_job_runs() TO authenticated;