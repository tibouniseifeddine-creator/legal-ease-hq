import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Users, Building2, FileText, FolderClosed, Receipt, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type Property = Tables<"properties">;
type Contract = Tables<"contracts">;
type Document = Tables<"documents">;
type Invoice = Tables<"invoices">;

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: "فرد", company: "شركة",
};
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sale: "بيع", rental: "إيجار", promise_to_sell: "وعد بالبيع", other: "أخرى",
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

export const Route = createFileRoute("/clients/$clientId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(clientDetailQueryOptions(params.clientId));
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
  const { data } = useSuspenseQuery(clientDetailQueryOptions(clientId));
  const { client, properties, contracts, documents, invoices } = data;

  const handleDownload = async (doc: Document) => {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (signed) window.open(signed.signedUrl, "_blank");
  };

  return (
    <AppShell user={user} organization={organization} title={client.full_name} subtitle={organization.name}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
          <ArrowRight className="w-4 h-4" />
          العودة لكل العملاء
        </Link>

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
                  <li key={c.id} className="p-4 flex items-center justify-between text-sm gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{CONTRACT_TYPE_LABELS[c.contract_type] ?? c.contract_type} · {formatDate(c.contract_date)}</div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${st.cls}`}>{st.label}</span>
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
    </AppShell>
  );
}
