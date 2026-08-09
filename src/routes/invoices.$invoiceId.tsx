import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Receipt, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type Client = Tables<"clients">;
type Contract = Tables<"contracts">;

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "غير مدفوعة", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "مدفوعة", cls: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "متأخرة", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
};

function invoiceDetailQueryOptions(invoiceId: string) {
  return {
    queryKey: ["invoice-detail", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (error) throw error;
      return data as Invoice;
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

export const Route = createFileRoute("/invoices/$invoiceId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(invoiceDetailQueryOptions(params.invoiceId)),
      context.queryClient.ensureQueryData(clientsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(contractsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "تفاصيل الفاتورة — NexLaw" }],
  }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { user, organization } = Route.useRouteContext();
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: invoice } = useSuspenseQuery(invoiceDetailQueryOptions(invoiceId));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const { data: contracts } = useSuspenseQuery(contractsListQueryOptions(organization.id));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canManage = role === "owner" || role === "admin";
  const client = clients.find((c) => c.id === invoice.client_id);
  const contract = contracts.find((c) => c.id === invoice.contract_id);

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    navigate({ to: "/invoices" });
  };

  const st = STATUS_LABELS[invoice.status] ?? STATUS_LABELS.unpaid;

  return (
    <AppShell user={user} organization={organization} title={invoice.title} subtitle={organization.name}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/invoices" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            <ArrowRight className="w-4 h-4" />
            العودة لكل الفواتير
          </Link>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editing ? "إلغاء التعديل" : "تعديل"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            </div>
          )}
        </div>

        {editing && canManage ? (
          <EditInvoiceForm
            invoice={invoice}
            clients={clients}
            contracts={contracts}
            onDone={() => setEditing(false)}
            onSaved={() => {
              invalidate();
              setEditing(false);
            }}
          />
        ) : (
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-navy text-lg truncate">{invoice.title}</h1>
                <div className="text-xs text-muted-foreground tabular-nums">{Number(invoice.amount).toLocaleString("ar-DZ")} دج</div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${st.cls}`}>{st.label}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">تاريخ الاستحقاق: </span>{invoice.due_date || "—"}</div>
              <div><span className="text-muted-foreground">العميل: </span>{client?.full_name || "—"}</div>
              <div><span className="text-muted-foreground">العقد المرتبط: </span>{contract?.title || "—"}</div>
              <div><span className="text-muted-foreground">تاريخ الدفع: </span>{invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("ar-DZ") : "—"}</div>
            </div>
          </section>
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy mb-2">حذف الفاتورة</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هل أنت متأكد أنك تريد حذف "{invoice.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm mb-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl h-11 font-bold hover:brightness-95 transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "جاري الحذف..." : "حذف نهائيًا"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-muted rounded-xl h-11 font-bold hover:bg-accent transition disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EditInvoiceForm({
  invoice,
  clients,
  contracts,
  onDone,
  onSaved,
}: {
  invoice: Invoice;
  clients: Client[];
  contracts: Contract[];
  onDone: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(invoice.title);
  const [amount, setAmount] = useState(String(invoice.amount));
  const [status, setStatus] = useState(invoice.status);
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [clientId, setClientId] = useState(invoice.client_id ?? "");
  const [contractId, setContractId] = useState(invoice.contract_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesUpdate<"invoices"> = {
      title: title.trim(),
      amount: Number(amount),
      status,
      due_date: dueDate || null,
      client_id: clientId || null,
      contract_id: contractId || null,
      paid_at: status === "paid" ? (invoice.paid_at ?? new Date().toISOString()) : null,
    };

    const { error: updateError } = await supabase.from("invoices").update(payload).eq("id", invoice.id);
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">تعديل الفاتورة</h2>
        <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="عنوان الفاتورة" value={title} onChange={setTitle} required />
        <Field label="المبلغ (دج)" value={amount} onChange={setAmount} type="number" required />
        <div>
          <label className="text-sm font-semibold text-navy">الحالة</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
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
        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
