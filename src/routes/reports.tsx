import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Users, Building2, FileText, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;
type Contract = Tables<"contracts">;
type Invoice = Tables<"invoices">;
type Task = Tables<"tasks">;

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  available: "متاح", reserved: "محجوز", sold: "مباع", rented: "مؤجّر",
};
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", pending_review: "قيد المراجعة", pending_signature: "بانتظار التوقيع", completed: "مكتمل",
};

function reportsQueryOptions(organizationId: string) {
  return {
    queryKey: ["reports", organizationId],
    queryFn: async () => {
      const [clientsRes, propertiesRes, contractsRes, invoicesRes, tasksRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("properties").select("*").eq("organization_id", organizationId),
        supabase.from("contracts").select("*").eq("organization_id", organizationId),
        supabase.from("invoices").select("*").eq("organization_id", organizationId),
        supabase.from("tasks").select("*").eq("organization_id", organizationId),
      ]);
      if (clientsRes.error) throw clientsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (tasksRes.error) throw tasksRes.error;
      return {
        clientsCount: clientsRes.count ?? 0,
        properties: (propertiesRes.data ?? []) as Property[],
        contracts: (contractsRes.data ?? []) as Contract[],
        invoices: (invoicesRes.data ?? []) as Invoice[],
        tasks: (tasksRes.data ?? []) as Task[],
      };
    },
  };
}

export const Route = createFileRoute("/reports")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(reportsQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [{ title: "التقارير — NexLaw" }],
  }),
  component: ReportsPage,
});

function countBy<T extends string>(items: { status: string }[], key: (s: string) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const label = key(item.status);
    out[label] = (out[label] ?? 0) + 1;
  }
  return out;
}

function ReportsPage() {
  const { organization } = Route.useRouteContext();
  const { data } = useSuspenseQuery(reportsQueryOptions(organization.id));

  const propertiesByStatus = countBy(data.properties, (s) => PROPERTY_STATUS_LABELS[s] ?? s);
  const contractsByStatus = countBy(data.contracts, (s) => CONTRACT_STATUS_LABELS[s] ?? s);
  const invoicesPaid = data.invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount), 0);
  const invoicesUnpaid = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Number(i.amount), 0);
  const tasksDone = data.tasks.filter((t) => t.task_type === "task" && t.is_done).length;
  const tasksTotal = data.tasks.filter((t) => t.task_type === "task").length;
  const appointmentsCount = data.tasks.filter((t) => t.task_type === "appointment").length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">التقارير والإحصائيات</div>
              <div className="text-xs text-muted-foreground">{organization.name}</div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="العملاء" value={data.clientsCount} tint="bg-indigo-100 text-indigo-600" />
          <StatCard icon={Building2} label="العقارات" value={data.properties.length} tint="bg-amber-100 text-amber-600" />
          <StatCard icon={FileText} label="العقود" value={data.contracts.length} tint="bg-sky-100 text-sky-600" />
          <StatCard icon={Receipt} label="الفواتير" value={data.invoices.length} tint="bg-emerald-100 text-emerald-600" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-navy mb-4">العقارات حسب الحالة</h2>
            {data.properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد بيانات بعد.</p>
            ) : (
              <BreakdownList data={propertiesByStatus} total={data.properties.length} />
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-navy mb-4">العقود حسب الحالة</h2>
            {data.contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد بيانات بعد.</p>
            ) : (
              <BreakdownList data={contractsByStatus} total={data.contracts.length} />
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-navy mb-4">الفواتير</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">محصّلة</span>
                <span className="font-bold text-emerald-600 tabular-nums">{invoicesPaid.toLocaleString("ar-DZ")} دج</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">غير محصّلة</span>
                <span className="font-bold text-red-600 tabular-nums">{invoicesUnpaid.toLocaleString("ar-DZ")} دج</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-navy mb-4">المهام والمواعيد</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مهام منجزة</span>
                <span className="font-bold text-navy tabular-nums">{tasksDone} / {tasksTotal}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مواعيد مسجّلة</span>
                <span className="font-bold text-navy tabular-nums">{appointmentsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: number; tint: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-extrabold mt-2 text-navy tabular-nums">{value}</div>
        </div>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${tint}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function BreakdownList({ data, total }: { data: Record<string, number>; total: number }) {
  return (
    <ul className="space-y-3">
      {Object.entries(data).map(([label, count]) => (
        <li key={label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{label}</span>
            <span className="text-muted-foreground tabular-nums">{count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gold" style={{ width: `${(count / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
