import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * شريط تنبيه يظهر تلقائيًا عند فشل أي مهمة مجدولة خلال آخر 7 أيام،
 * مع رابط مباشر إلى صفحة سجلات المهام.
 */
export function JobFailureBanner() {
  const { data } = useQuery({
    queryKey: ["job-failure-alerts"],
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("job_failure_alerts")
        .select("id, job_name, run_started_at, error_message")
        .gte("detected_at", since)
        .order("detected_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data ?? [];
    },
  });

  if (!data || data.length === 0) return null;

  const latest = data[0]!;

  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-red-700 text-sm">
          فشل تنفيذ مهمة مجدولة: {latest.job_name}
          {data.length > 1 ? ` (+${data.length - 1} أخرى)` : ""}
        </div>
        <div className="text-xs text-red-600/90 mt-1 truncate">
          {latest.error_message || "بدون تفاصيل"}
          {latest.run_started_at
            ? ` — ${new Date(latest.run_started_at).toLocaleString("ar-DZ")}`
            : ""}
        </div>
      </div>
      <Link
        to="/job-logs"
        className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-red-600 text-white h-10 px-4 text-sm font-bold hover:brightness-95 transition"
      >
        عرض السجلات
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </div>
  );
}
