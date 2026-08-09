import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, FileText, Printer, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

type Contract = Tables<"contracts">;

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  rental: "إيجار",
  promise_to_sell: "وعد بالبيع",
  agency: "وكالة",
  other: "أخرى",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_review: "قيد المراجعة",
  pending_signature: "بانتظار التوقيع",
  completed: "مكتمل",
};

function contractQueryOptions(contractId: string) {
  return {
    queryKey: ["contract-detail", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("id", contractId).single();
      if (error) throw error;
      return data as Contract;
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

export const Route = createFileRoute("/contracts/$contractId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(contractQueryOptions(params.contractId)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "عرض العقد — NexLaw" }],
  }),
  component: ContractDetailPage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-DZ", { day: "numeric", month: "long", year: "numeric" });
}

function ContractDetailPage() {
  const { organization, user } = Route.useRouteContext();
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contract } = useSuspenseQuery(contractQueryOptions(contractId));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canDelete = role === "owner" || role === "admin";

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handlePrint = () => window.print();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["contract-detail", contractId] });

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("contracts").delete().eq("id", contractId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    navigate({ to: "/contracts" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gold-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-navy truncate">عرض العقد</div>
              <div className="text-xs text-muted-foreground truncate">{organization.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{editing ? "إلغاء" : "تعديل"}</span>
            </button>
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة / تصدير PDF</span>
            </button>
            <Link to="/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">العودة للعقود</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        {editing ? (
          <EditContractForm
            contract={contract}
            onDone={() => setEditing(false)}
            onSaved={() => {
              invalidate();
              setEditing(false);
            }}
          />
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 print:border-0 print:rounded-none print:p-0 print:shadow-none">
            <div className="text-center mb-8 pb-6 border-b-2 border-navy print:border-black">
              <h1 className="text-2xl font-extrabold text-navy">{contract.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {TYPE_LABELS[contract.contract_type] ?? contract.contract_type} · {STATUS_LABELS[contract.status] ?? contract.status}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm mb-8 text-muted-foreground">
              <div>تاريخ التحرير: {formatDate(contract.contract_date)}</div>
              <div>تاريخ الانتهاء: {formatDate(contract.end_date)}</div>
            </div>

            <div className="text-sm leading-8 whitespace-pre-wrap text-navy font-medium">
              {contract.content || "لم يُكتب نص لهذا العقد بعد."}
            </div>
          </div>
        )}
      </main>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:hidden"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy mb-2">حذف العقد</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هل أنت متأكد أنك تريد حذف "{contract.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
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

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
}

function EditContractForm({
  contract,
  onDone,
  onSaved,
}: {
  contract: Contract;
  onDone: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(contract.title);
  const [status, setStatus] = useState(contract.status);
  const [contractDate, setContractDate] = useState(contract.contract_date);
  const [endDate, setEndDate] = useState(contract.end_date ?? "");
  const [content, setContent] = useState(contract.content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesUpdate<"contracts"> = {
      title: title.trim(),
      status,
      contract_date: contractDate,
      end_date: endDate || null,
      content: content.trim() || null,
    };

    const { error: updateError } = await supabase.from("contracts").update(payload).eq("id", contract.id);
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
        <h2 className="font-bold text-navy">تعديل العقد</h2>
        <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-navy">عنوان العقد</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">الحالة</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">التاريخ</label>
          <input
            type="date"
            required
            value={contractDate}
            onChange={(e) => setContractDate(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">تاريخ الانتهاء (اختياري)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-navy">نص العقد</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="mt-2 w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-4 text-sm font-mono leading-relaxed resize-y"
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
        disabled={loading || !title.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
