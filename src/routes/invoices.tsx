import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { Field } from "@/components/Field";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  sent: { label: "مُرسلة", cls: "bg-sky-100 text-sky-700" },
  paid: { label: "مدفوعة", cls: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "متأخرة", cls: "bg-red-100 text-red-700" },
};

function invoicesQueryOptions(organizationId: string) {
  return {
    queryKey: ["invoices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  };
}

export const Route = createFileRoute("/invoices")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(invoicesQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [
      { title: "الفواتير — NexLaw" },
      { name: "description", content: "تابع فواتير مكتبك ومدفوعات عملائك." },
      { property: "og:title", content: "الفواتير — NexLaw" },
      { property: "og:description", content: "تابع فواتير مكتبك ومدفوعات عملائك." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: invoices } = useSuspenseQuery(invoicesQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  const total = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <AppShell user={user} organization={organization} title="الفواتير" subtitle={`${invoices.length} فاتورة`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <SummaryCard label="إجمالي الفواتير" value={total} />
          <SummaryCard label="المحصّل" value={paid} />
          <SummaryCard label="المتبقي" value={total - paid} />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "فاتورة جديدة"}
          </button>
        </div>

        {showForm && (
          <NewInvoiceForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["invoices", organization.id] })}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="لا توجد فواتير بعد" hint='اضغط "فاتورة جديدة" لإنشاء أول فاتورة.' />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">الفاتورة</th>
                  <th className="text-right font-medium px-5 py-3">المبلغ</th>
                  <th className="text-right font-medium px-5 py-3">تاريخ الاستحقاق</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const st = STATUS_LABELS[i.status] ?? STATUS_LABELS.draft;
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{i.title}</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">
                        {Number(i.amount).toLocaleString("ar-DZ")} دج
                      </td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{i.due_date || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-navy tabular-nums">
        {value.toLocaleString("ar-DZ")} <span className="text-sm font-semibold">دج</span>
      </div>
    </div>
  );
}

function NewInvoiceForm({
  organizationId, onDone, onCreated,
}: { organizationId: string; onDone: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from("invoices").insert({
      organization_id: organizationId,
      title: title.trim(),
      amount: Number(amount || 0),
      status,
      due_date: dueDate || null,
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">فاتورة جديدة</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-navy">عنوان الفاتورة</label>
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: أتعاب تحرير عقد بيع"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">المبلغ (دج)</label>
          <input
            required type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="50000"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">الحالة</label>
          <select
            value={status} onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">تاريخ الاستحقاق</label>
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit" disabled={loading || !title.trim() || !amount.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
      </button>
    </form>
  );
}
