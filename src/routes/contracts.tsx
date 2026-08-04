import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Tables } from "@/integrations/supabase/types";

type Contract = Tables<"contracts">;

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  rent: "إيجار",
  promise: "وعد بالبيع",
  other: "أخرى",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  review: { label: "قيد المراجعة", cls: "bg-sky-100 text-sky-700" },
  signed: { label: "موقّع", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغى", cls: "bg-red-100 text-red-700" },
};

function contractsQueryOptions(organizationId: string) {
  return {
    queryKey: ["contracts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
  };
}

export const Route = createFileRoute("/contracts")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(contractsQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [
      { title: "العقود — NexLaw" },
      { name: "description", content: "إدارة عقود البيع والإيجار والوعد بالبيع داخل مكتبك." },
      { property: "og:title", content: "العقود — NexLaw" },
      { property: "og:description", content: "إدارة عقود البيع والإيجار والوعد بالبيع داخل مكتبك." },
    ],
  }),
  component: ContractsPage,
});

function ContractsPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: contracts } = useSuspenseQuery(contractsQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell user={user} organization={organization} title="العقود" subtitle={`${contracts.length} عقد`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "عقد جديد"}
          </button>
        </div>

        {showForm && (
          <NewContractForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["contracts", organization.id] })}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {contracts.length === 0 ? (
            <EmptyState icon={FileText} title="لا يوجد عقود بعد" hint='اضغط "عقد جديد" لإنشاء أول عقد.' />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">العنوان</th>
                  <th className="text-right font-medium px-5 py-3">النوع</th>
                  <th className="text-right font-medium px-5 py-3">التاريخ</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{c.title}</td>
                      <td className="px-5 py-3 text-muted-foreground">{TYPE_LABELS[c.contract_type] ?? c.contract_type}</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{c.contract_date}</td>
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

function NewContractForm({
  organizationId, onDone, onCreated,
}: { organizationId: string; onDone: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("sale");
  const [status, setStatus] = useState("draft");
  const [contractDate, setContractDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from("contracts").insert({
      organization_id: organizationId,
      title: title.trim(),
      contract_type: contractType,
      status,
      contract_date: contractDate,
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">عقد جديد</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-navy">عنوان العقد</label>
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: عقد بيع شقة سكنية"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={contractType} onChange={(e) => setContractType(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
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
          <label className="text-sm font-semibold text-navy">تاريخ العقد</label>
          <input
            type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)}
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
        type="submit" disabled={loading || !title.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ العقد"}
      </button>
    </form>
  );
}
