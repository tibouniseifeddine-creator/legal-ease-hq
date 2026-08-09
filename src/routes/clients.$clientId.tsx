import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Users, Building2, FileText, FolderClosed, Receipt, Download, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type Property = Tables<"properties">;
type Contract = Tables<"contracts">;
type Document = Tables<"documents">;
type Invoice = Tables<"invoices">;

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: "فرد", company: "شركة",
};
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sale: "بيع", rental: "إيجار", promise_to_sell: "وعد بالبيع", agency: "وكالة", other: "أخرى",
};
const CONTRACT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", cls: "bg-sky-100 text-sky-700" },
  pending_signature: { label: "بانتظار التوقيع", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", cls: "bg-emerald-100 text-emerald-700" },
};
const INVOICE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "غير مدفوعة", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "مدفوعة", cls: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "متأخرة", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
};

function clientDetailQueryOptions(clientId: string) {
  return {
    queryKey: ["client-detail", clientId],
    queryFn: async () => {
      const [clientRes, propertiesRes, contractsRes, documentsRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("properties").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      ]);
      if (clientRes.error) throw clientRes.error;
      if (propertiesRes.error) throw propertiesRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (documentsRes.error) throw documentsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      return {
        client: clientRes.data as Client,
        properties: (propertiesRes.data ?? []) as Property[],
        contracts: (contractsRes.data ?? []) as Contract[],
        documents: (documentsRes.data ?? []) as Document[],
        invoices: (invoicesRes.data ?? []) as Invoice[],
      };
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

export const Route = createFileRoute("/clients/$clientId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(clientDetailQueryOptions(params.clientId)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "تفاصيل العميل — NexLaw" }],
  }),
  component: ClientDetailPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-DZ", { day: "numeric", month: "short", year: "numeric" });
}

function ClientDetailPage() {
  const { user, organization } = Route.useRouteContext();
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(clientDetailQueryOptions(clientId));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const { client, properties, contracts, documents, invoices } = data;
  const canDelete = role === "owner" || role === "admin";

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });

  const handleDownload = async (doc: Document) => {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (signed) window.open(signed.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    navigate({ to: "/clients" });
  };

  return (
    <AppShell user={user} organization={organization} title={client.full_name} subtitle={organization.name}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            <ArrowRight className="w-4 h-4" />
            العودة لكل العملاء
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent"
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? "إلغاء التعديل" : "تعديل"}
            </button>
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <EditClientForm
            client={client}
            onDone={() => setEditing(false)}
            onSaved={() => {
              invalidate();
              setEditing(false);
            }}
          />
        ) : (
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
                {client.full_name.trim().charAt(0) || "؟"}
              </div>
              <div>
                <h1 className="font-bold text-navy text-lg">{client.full_name}</h1>
                <div className="text-xs text-muted-foreground">{CLIENT_TYPE_LABELS[client.client_type] ?? client.client_type}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">الهاتف: </span>{client.phone || "—"}</div>
              <div><span className="text-muted-foreground">البريد: </span>{client.email || "—"}</div>
              <div><span className="text-muted-foreground">رقم الهوية: </span>{client.national_id || "—"}</div>
              <div><span className="text-muted-foreground">العنوان: </span>{client.address || "—"}</div>
            </div>
            {client.notes && (
              <p className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">{client.notes}</p>
            )}
          </section>
        )}

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-border font-bold text-navy">
            <Building2 className="w-4 h-4" />
            العقارات ({properties.length})
          </div>
          {properties.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا يوجد عقارات مرتبطة بهذا العميل.</p>
          ) : (
            <ul className="divide-y divide-border">
              {properties.map((p) => (
                <li key={p.id} className="p-4 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.price != null ? `${Number(p.price).toLocaleString("ar-DZ")} دج` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-border font-bold text-navy">
            <FileText className="w-4 h-4" />
            العقود ({contracts.length})
          </div>
          {contracts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا يوجد عقود مرتبطة بهذا العميل.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contracts.map((c) => {
                const st = CONTRACT_STATUS_LABELS[c.status] ?? CONTRACT_STATUS_LABELS.draft;
                return (
                  <li key={c.id}>
                    <Link
                      to="/contracts/$contractId"
                      params={{ contractId: c.id }}
                      className="p-4 flex items-center justify-between text-sm gap-3 hover:bg-muted/40 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{CONTRACT_TYPE_LABELS[c.contract_type] ?? c.contract_type} · {formatDate(c.contract_date)}</div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${st.cls}`}>{st.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-border font-bold text-navy">
            <FolderClosed className="w-4 h-4" />
            الوثائق ({documents.length})
          </div>
          {documents.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا يوجد وثائق مرتبطة بهذا العميل.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((d) => (
                <li key={d.id} className="p-4 flex items-center justify-between text-sm">
                  <span className="font-medium">{d.title}</span>
                  <button
                    onClick={() => handleDownload(d)}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-navy transition"
                    title="تنزيل"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-border font-bold text-navy">
            <Receipt className="w-4 h-4" />
            الفواتير ({invoices.length})
          </div>
          {invoices.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا يوجد فواتير مرتبطة بهذا العميل.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((inv) => {
                const st = INVOICE_STATUS_LABELS[inv.status] ?? INVOICE_STATUS_LABELS.unpaid;
                return (
                  <li key={inv.id} className="p-4 flex items-center justify-between text-sm gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{inv.title}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{Number(inv.amount).toLocaleString("ar-DZ")} دج</div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${st.cls}`}>{st.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy mb-2">حذف العميل</h3>
            <p className="text-sm text-muted-foreground mb-2">
              هل أنت متأكد أنك تريد حذف "{client.full_name}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            {(properties.length > 0 || contracts.length > 0 || documents.length > 0 || invoices.length > 0) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                ملاحظة: العقارات والعقود والوثائق والفواتير المرتبطة بهذا العميل ستبقى موجودة، لكن سيُزال ارتباطها به.
              </p>
            )}
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

function EditClientForm({
  client,
  onDone,
  onSaved,
}: {
  client: Client;
  onDone: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(client.full_name);
  const [clientType, setClientType] = useState<"individual" | "company">(client.client_type as "individual" | "company");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [nationalId, setNationalId] = useState(client.national_id ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesUpdate<"clients"> = {
      full_name: fullName.trim(),
      client_type: clientType,
      phone: phone.trim() || null,
      email: email.trim() || null,
      national_id: nationalId.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: updateError } = await supabase.from("clients").update(payload).eq("id", client.id);
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
        <h2 className="font-bold text-navy">تعديل بيانات العميل</h2>
        <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم الكامل" value={fullName} onChange={setFullName} required placeholder="مثال: أحمد بن علي" />
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={clientType}
            onChange={(e) => setClientType(e.target.value as "individual" | "company")}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="individual">فرد</option>
            <option value="company">شركة</option>
          </select>
        </div>
        <Field label="الهاتف" value={phone} onChange={setPhone} placeholder="0555 12 34 56" />
        <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        <Field label="رقم الهوية / السجل التجاري" value={nationalId} onChange={setNationalId} />
        <Field label="العنوان" value={address} onChange={setAddress} />
      </div>

      <div>
        <label className="text-sm font-semibold text-navy">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-4 text-sm resize-y"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !fullName.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
