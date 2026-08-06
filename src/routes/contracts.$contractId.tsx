import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables } from "@/integrations/supabase/types";

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

export const Route = createFileRoute("/contracts/$contractId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(contractQueryOptions(params.contractId));
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
  const { organization } = Route.useRouteContext();
  const { contractId } = Route.useParams();
  const { data: contract } = useSuspenseQuery(contractQueryOptions(contractId));

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">عرض العقد</div>
              <div className="text-xs text-muted-foreground">{organization.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
            >
              <Printer className="w-4 h-4" />
              طباعة / تصدير PDF
            </button>
            <Link to="/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
              العودة للعقود
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="bg-card border border-border rounded-2xl p-10 print:border-0 print:rounded-none print:p-0 print:shadow-none">
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
      </main>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
}
