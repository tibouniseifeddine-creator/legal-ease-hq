create table if not exists public.job_failure_alerts (
  id uuid primary key default gen_random_uuid(),
  runid bigint unique,
  jobid bigint,
  job_name text not null,
  status text not null,
  error_message text,
  run_started_at timestamptz,
  run_ended_at timestamptz,
  detected_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

grant select on public.job_failure_alerts to authenticated;
grant all on public.job_failure_alerts to service_role;

alter table public.job_failure_alerts enable row level security;

drop policy if exists "members can read job alerts" on public.job_failure_alerts;
create policy "members can read job alerts"
on public.job_failure_alerts
for select
to authenticated
using (exists (select 1 from public.organization_members om where om.user_id = auth.uid()));

create or replace function public.list_job_runs()
returns table(runid bigint, jobid bigint, job_name text, status text, return_message text, start_time timestamptz, end_time timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select d.runid, d.jobid, j.jobname::text, d.status::text, d.return_message::text, d.start_time, d.end_time
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
  where exists (select 1 from public.organization_members om where om.user_id = auth.uid())
  order by d.start_time desc
  limit 100;
$$;

revoke all on function public.list_job_runs() from public, anon;
grant execute on function public.list_job_runs() to authenticated;

create or replace function public.check_scheduled_job_failures()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  failure record;
  resend_key text;
  recipient_emails text[];
  html_body text;
begin
  for failure in
    select d.runid, d.jobid, j.jobname::text as job_name, d.status::text as status,
           d.return_message::text as return_message, d.start_time, d.end_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where d.status in ('failed', 'error')
      and d.start_time > now() - interval '2 days'
      and not exists (select 1 from public.job_failure_alerts a where a.runid = d.runid)
    order by d.start_time asc
  loop
    insert into public.job_failure_alerts (runid, jobid, job_name, status, error_message, run_started_at, run_ended_at)
    values (failure.runid, failure.jobid, failure.job_name, failure.status, failure.return_message, failure.start_time, failure.end_time)
    on conflict (runid) do nothing;

    select decrypted_secret into resend_key from vault.decrypted_secrets where name = 'resend_api_key';
    if resend_key is null then
      continue;
    end if;

    select array_agg(distinct u.email) into recipient_emails
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.role in ('owner', 'admin');

    if recipient_emails is null or array_length(recipient_emails, 1) = 0 then
      continue;
    end if;

    html_body := format(
      '<div dir="rtl" style="font-family: Arial, sans-serif;"><h2>فشل مهمة مجدولة</h2><p><b>المهمة:</b> %s</p><p><b>الحالة:</b> %s</p><p><b>وقت التشغيل:</b> %s</p><pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">%s</pre><p><a href="https://legal-ease-hq.lovable.app/job-logs">عرض سجلات المهام</a></p></div>',
      failure.job_name, failure.status, failure.start_time, coalesce(failure.return_message, 'بدون تفاصيل')
    );

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'NexLaw <onboarding@resend.dev>',
        'to', recipient_emails,
        'subject', format('تنبيه: فشل المهمة المجدولة %s', failure.job_name),
        'html', html_body
      )
    );
  end loop;
end;
$$;

revoke all on function public.check_scheduled_job_failures() from public, anon, authenticated;