import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell, EmptyState } from "@/components/AppShell";

type JobRun = {
  runid: number;
  jobid: number;
  job_name: string;
  status: string;
  return_message: string | null;
  start_time: string | null;
  end_time: string | null;
};

function jobLogsQueryOptions() {
  return {
    queryKey: ["job-logs"],
    queryFn: async () => {
      const [runsRes, alertsRes] = await Promise.all([
        supabase.rpc("list_job_runs"),
        supabase
          .from("job_failure_alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(50),
      ]);
      if (runsRes.error) throw runsRes.error;
      if (alertsRes.error) throw alertsRes.error;
      return {
        runs: (runsRes.data ?? []) as JobRun[],
        alerts: alertsRes.data ?? [],
      };
    },
  };
}

export const Route = createFileRoute("/job-logs")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobLogsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "سجلات المهام المجدولة — NexLaw" },
      { name: "description", content: "تتبّع تنفيذ المهام المجدولة في NexLaw واعرف سبب فشل أي مهمة فورًا." },
      { property: "og:title", content: "سجلات المهام المجدولة — NexLaw" },
      { property: "og:description", content: "تتبّع تنفيذ المهام المجدولة في NexLaw واعرف سبب فشل أي مهمة فورًا." },
    ],
  }),
  component: JobLogsPage,
});

function statusBadge(status: string) {
  const failed = status === "failed" || status === "error";
  return failed
    ? "bg-red-100 text-red-700"
    : status === "succeeded"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
}

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString("ar-DZ") : "—";
}

function JobLogsPage() {
  const { user, organization } = Route.useRouteContext();
  const { data, refetch, isFetching } = useSuspenseQuery(jobLogsQueryOptions());

  return (
    <AppShell
      user={user}
      organization={organization}
      title="سجلات المهام المجدولة"
      subtitle="تنبيهات الفشل وتاريخ تنفيذ المهام التلقائية"
      actions={
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl bg-muted h-10 px-4 text-sm font-bold hover:bg-accent transition"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-navy">تنبيهات الفشل</h2>
          </div>
          {data.alerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              لا توجد أعطال مسجّلة — كل المهام المجدولة تعمل بشكل سليم.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.alerts.map((a) => (
                <li key={a.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-navy text-sm">{a.job_name}</div>
                    <span className={`text-[11px] px-2 py-1 rounded-lg font-bold ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    وقت التشغيل: {fmt(a.run_started_at)} — رُصد في: {fmt(a.detected_at)}
                  </div>
                  {a.error_message && (
                    <pre className="mt-3 text-xs bg-muted rounded-xl p-3 whitespace-pre-wrap break-words text-navy/80">
                      {a.error_message}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-navy">آخر عمليات التنفيذ</h2>
          </div>
          {data.runs.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="لا توجد سجلات تنفيذ بعد"
              hint="ستظهر هنا كل عمليات تشغيل المهام المجدولة فور تنفيذها."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right font-semibold p-3">المهمة</th>
                    <th className="text-right font-semibold p-3">الحالة</th>
                    <th className="text-right font-semibold p-3">البداية</th>
                    <th className="text-right font-semibold p-3">النهاية</th>
                    <th className="text-right font-semibold p-3">الرسالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.runs.map((r) => (
                    <tr key={r.runid}>
                      <td className="p-3 font-semibold text-navy whitespace-nowrap">{r.job_name}</td>
                      <td className="p-3">
                        <span className={`text-[11px] px-2 py-1 rounded-lg font-bold ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{fmt(r.start_time)}</td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{fmt(r.end_time)}</td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">{r.return_message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
