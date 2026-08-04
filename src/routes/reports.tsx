import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Users, Building2, FileText, Receipt, CheckSquare, FolderClosed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";

async function countRows(table: "clients" | "properties" | "contracts" | "documents" | "tasks" | "invoices", orgId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (error) throw error;
  return count ?? 0;
}

function reportsQueryOptions(organizationId: string) {
  return {
    queryKey: ["reports", organizationId],
    queryFn: async () => {
      const [clients, properties, contracts, documents, tasks, invoices] = await Promise.all([
        countRows("clients", organizationId),
        countRows("properties", organizationId),
        countRows("contracts", organizationId),
        countRows("documents", organizationId),
        countRows("tasks", organizationId),
        countRows("invoices", organizationId),
      ]);

      const { data: invoiceRows, error } = await supabase
        .from("invoices")
        .select("amount, status")
        .eq("organization_id", organizationId);
      if (error) throw error;

      const total = (invoiceRows ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
      const paid = (invoiceRows ?? [])
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + Number(i.amount || 0), 0);

      return { clients, properties, contracts, documents, tasks, invoices, total, paid };
    },
  };
}

export const Route = createFileRoute("/reports")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(reportsQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [
      { title: "التقارير — NexLaw" },
      { name: "description", content: "نظرة إحصائية على نشاط مكتبك: العملاء، العقود، العقارات والفواتير." },
      { property: "og:title", content: "التقارير — NexLaw" },
      { property: "og:description", content: "نظرة إحصائية على نشاط مكتبك: العملاء، العقود، العقارات والفواتير." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user, organization } = Route.useRouteContext();
  const { data } = useSuspenseQuery(reportsQueryOptions(organization.id));

  const cards = [
    { label: "العملاء", value: data.clients, icon: Users, to: "/clients", tint: "bg-indigo-100 text-indigo-600" },
    { label: "العقارات", value: data.properties, icon: Building2, to: "/properties", tint: "bg-emerald-100 text-emerald-600" },
    { label: "العقود", value: data.contracts, icon: FileText, to: "/contracts", tint: "bg-amber-100 text-amber-600" },
    { label: "الوثائق", value: data.documents, icon: FolderClosed, to: "/documents", tint: "bg-sky-100 text-sky-600" },
    { label: "المهام والمواعيد", value: data.tasks, icon: CheckSquare, to: "/tasks", tint: "bg-purple-100 text-purple-600" },
    { label: "الفواتير", value: data.invoices, icon: Receipt, to: "/invoices", tint: "bg-rose-100 text-rose-600" },
  ] as const;

  return (
    <AppShell user={user} organization={organization} title="التقارير" subtitle="نظرة عامة على نشاط المكتب">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="bg-card rounded-2xl border border-border p-5 hover:bg-muted/40 transition">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.tint}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-navy tabular-nums">{c.value}</div>
              </div>
              <div className="mt-3 text-sm font-semibold text-navy">{c.label}</div>
            </Link>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-navy">الملخص المالي</h2>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">إجمالي الفواتير</div>
              <div className="mt-1 text-xl font-bold text-navy tabular-nums">{data.total.toLocaleString("ar-DZ")} دج</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">المحصّل</div>
              <div className="mt-1 text-xl font-bold text-emerald-600 tabular-nums">{data.paid.toLocaleString("ar-DZ")} دج</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">المتبقي</div>
              <div className="mt-1 text-xl font-bold text-amber-600 tabular-nums">
                {(data.total - data.paid).toLocaleString("ar-DZ")} دج
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
