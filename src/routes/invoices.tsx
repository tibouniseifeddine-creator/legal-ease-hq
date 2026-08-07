import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, Receipt, Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type Client = Tables<"clients">;
type Contract = Tables<"contracts">;

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "غير مدفوعة", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "مدفوعة", cls: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "متأخرة", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
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

function clientsListQueryOptions(organizationId: string) {
  return {
    queryKey: ["clients-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  };
}

function contractsListQueryOptions(organizationId: string) {
  return {
    queryKey: ["contracts-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
  };
}

function myRoleQueryOptions(organizationId: string, userId: string) {
  return {
    queryKey: ["my-role", organizationId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data.role as string;
    },
  };
}

export const Route = createFileRoute("/invoices")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(invoicesQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(clientsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(contractsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "الفواتير — NexLaw" }],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: invoices } = useSuspenseQuery(invoicesQueryOptions(organization.id));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const { data: contracts } = useSuspenseQuery(contractsListQueryOptions(organization.id));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canManage = role === "owner" || role === "admin";
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices", organization.id] });

  const setStatus = async (invoice: Invoice, status: string) => {
    await supabase
      .from("invoices")
      .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
      .eq("id", invoice.id);
    invalidate();
  };

  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const unpaidTotal = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <AppShell user={user} organization={organization} title="الفواتير" subtitle="الفواتير والملخص المالي">

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="text-sm text-muted-foreground">إجمالي الفواتير</div>
            <div className="text-2xl font-extrabold mt-1 text-navy tabular-nums">{total.toLocaleString("ar-DZ")} دج</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="text-sm text-muted-foreground">غير محصّل</div>
            <div className="text-2xl font-extrabold mt-1 text-red-600 tabular-nums">{unpaidTotal.toLocaleString("ar-DZ")} دج</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {invoices.length} فاتورة
            {!canManage && <span className="mr-2">— عرض فقط</span>}
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "إلغاء" : "فاتورة جديدة"}
            </button>
          )}
        </div>

        {canManage && showForm && (
          <NewInvoiceForm
            organizationId={organization.id}
            clients={clients}
            contracts={contracts}
            onDone={() => setShowForm(false)}
            onCreated={invalidate}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد فواتير بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {canManage ? 'اضغط "فاتورة جديدة" لإنشاء أول فاتورة لمكتبك.' : "لا توجد فواتير مسجَّلة حاليًا."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">الفاتورة</th>
                  <th className="text-right font-medium px-5 py-3">المبلغ</th>
                  <th className="text-right font-medium px-5 py-3">الاستحقاق</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = STATUS_LABELS[inv.status] ?? STATUS_LABELS.unpaid;
                  return (
                    <tr key={inv.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{inv.title}</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{Number(inv.amount).toLocaleString("ar-DZ")} دج</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{inv.due_date || "—"}</td>
                      <td className="px-5 py-3">
                        {canManage ? (
                          <select
                            value={inv.status}
                            onChange={(e) => setStatus(inv, e.target.value)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md border-0 focus:outline-none focus:ring-1 focus:ring-gold ${st.cls}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${st.cls}`}>{st.label}</span>
                        )}
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

function NewInvoiceForm({
  organizationId,
  clients,
  contracts,
  onDone,
  onCreated,
}: {
  organizationId: string;
  clients: Client[];
  contracts: Contract[];
  onDone: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesInsert<"invoices"> = {
      organization_id: organizationId,
      title: title.trim(),
      amount: Number(amount),
      due_date: dueDate || null,
      client_id: clientId || null,
      contract_id: contractId || null,
    };

    const { error: insertError } = await supabase.from("invoices").insert(payload);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">فاتورة جديدة</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="عنوان الفاتورة" value={title} onChange={setTitle} required placeholder="مثال: أتعاب توثيق عقد بيع" />
        <Field label="المبلغ (دج)" value={amount} onChange={setAmount} type="number" required placeholder="50000" />
        <Field label="تاريخ الاستحقاق" value={dueDate} onChange={setDueDate} type="date" />
        <div>
          <label className="text-sm font-semibold text-navy">العميل (اختياري)</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="">— بدون —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">العقد (اختياري)</label>
          <select
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="">— بدون —</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !title.trim() || !amount}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
      </button>
    </form>
  );
}
