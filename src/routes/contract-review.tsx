import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowRight, Sparkles, FileText, AlertTriangle, CheckCircle2,
  XCircle, AlertCircle, Lightbulb, Loader2, ClipboardList,
} from "lucide-react";
import { reviewContract, type ContractReview } from "@/lib/contract-review.functions";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/contract-review")({
  beforeLoad: requireOrgSession,
  head: () => ({
    meta: [
      { title: "مراجعة العقود بالذكاء الاصطناعي — NexLaw" },
      { name: "description", content: "أداة مراجعة ذكية للعقود: تحليل البنود، اكتشاف المخاطر، والاقتراحات." },
    ],
  }),
  component: ContractReviewPage,
});

const SAMPLE = `عقد بيع شقة سكنية
المادة الأولى: يبيع الطرف الأول (البائع) للطرف الثاني (المشتري) شقة سكنية بمساحة 90 متر مربع، الكائنة بحي النصر، الجزائر العاصمة.
المادة الثانية: تم الاتفاق على ثمن قدره 15.000.000 دج، يدفع نقدًا عند التوقيع.
المادة الثالثة: يلتزم البائع بتسليم الشقة خالية من كل شاغل.
المادة الرابعة: كل نزاع يخضع للمحاكم الجزائرية.`;

function ContractReviewPage() {
  const { user, organization } = Route.useRouteContext();
  const runReview = useServerFn(reviewContract);
  const [text, setText] = useState("");
  const [type, setType] = useState("عقد بيع");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractReview | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runReview({ data: { contractText: text.trim(), contractType: type.trim() || null } });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل الاتصال بالمساعد الذكي";
      setError(message.includes("429") ? "تم تجاوز الحد المسموح، جرب لاحقًا." : message.includes("402") ? "رصيد الذكاء الاصطناعي غير كافٍ، يرجى إضافة رصيد." : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell user={user} organization={organization} title="مراجعة العقد" subtitle="تحليل البنود والمخاطر بالذكاء الاصطناعي">

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Input */}
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4 lg:h-fit lg:sticky lg:top-24">
          <div>
            <label className="text-sm font-semibold text-navy">نوع العقد</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="مثال: عقد بيع، إيجار، وعد بالبيع"
              className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-navy">نص العقد</label>
              <button
                type="button"
                onClick={() => { setText(SAMPLE); setType("عقد بيع"); }}
                className="text-xs text-sky-600 font-semibold hover:underline"
              >
                استخدام نموذج تجريبي
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق نص العقد هنا للتحليل..."
              rows={14}
              className="w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-4 text-sm font-mono leading-relaxed resize-y"
            />
            <div className="text-xs text-muted-foreground mt-1 text-left tabular-nums">{text.length} حرف</div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || text.trim().length < 20}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-12 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                مراجعة العقد الآن
              </>
            )}
          </button>
        </form>

        {/* Result */}
        <section className="space-y-4">
          {!result && !loading && (
            <EmptyState />
          )}
          {loading && <LoadingState />}
          {result && <ReviewResult data={result} />}
          <div className="text-[10px] text-muted-foreground text-center">
            التحليل مقدم لأغراض إرشادية ولا يعوض المراجعة القانونية البشرية.
          </div>
          <button onClick={() => router.invalidate()} className="hidden" />
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
        <FileText className="w-7 h-7 text-gold" />
      </div>
      <h2 className="mt-4 font-bold text-navy text-lg">في انتظار العقد</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        الصق نص العقد في الجهة اليمنى، وسيقوم مساعد NexLaw الذكي بتحليل البنود، رصد البنود الناقصة، وإبراز المخاطر مع اقتراحات للتحسين.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${100 - i * 8}%` }} />
      ))}
      <div className="text-xs text-muted-foreground pt-2">يقوم الذكاء الاصطناعي بقراءة البنود...</div>
    </div>
  );
}

const riskConfig = {
  low: { label: "منخفض", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "متوسط", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  high: { label: "مرتفع", cls: "bg-red-100 text-red-700 border-red-200" },
};

const statusConfig = {
  ok: { label: "سليم", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  weak: { label: "ضعيف", icon: AlertTriangle, cls: "text-amber-600 bg-amber-50" },
  missing: { label: "مفقود", icon: XCircle, cls: "text-red-600 bg-red-50" },
  risky: { label: "خطير", icon: AlertCircle, cls: "text-red-600 bg-red-50" },
};

function ReviewResult({ data }: { data: ContractReview }) {
  const risk = riskConfig[data.overallRisk];
  return (
    <div className="space-y-4">
      {/* Summary + risk */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              ملخص المراجعة
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{data.summary}</p>
          </div>
          <div className={`shrink-0 rounded-xl border px-3 py-2 text-center ${risk.cls}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide">مستوى الخطر</div>
            <div className="text-sm font-bold mt-0.5">{risk.label}</div>
          </div>
        </div>
      </div>

      {/* Clauses */}
      {data.clauses.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border font-bold text-navy">
            <ClipboardList className="w-4 h-4 text-gold" />
            تحليل البنود
          </div>
          <ul className="divide-y divide-border">
            {data.clauses.map((c, i) => {
              const s = statusConfig[c.status];
              return (
                <li key={i} className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.cls}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm">{c.title}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.note}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Missing */}
      {data.missingClauses.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 font-bold text-navy mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            بنود ناقصة يجب إضافتها
          </div>
          <ul className="space-y-2">
            {data.missingClauses.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 font-bold text-navy mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            المخاطر القانونية
          </div>
          <ul className="space-y-3">
            {data.risks.map((r, i) => {
              const rc = riskConfig[r.severity];
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 border ${rc.cls}`}>{rc.label}</span>
                  <span className="text-sm leading-relaxed">{r.description}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="bg-navy text-navy-foreground rounded-2xl p-6">
          <div className="flex items-center gap-2 font-bold mb-3">
            <Lightbulb className="w-4 h-4 text-gold" />
            اقتراحات لتحسين العقد
          </div>
          <ul className="space-y-2">
            {data.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                <span className="w-5 h-5 rounded-full bg-gold text-gold-foreground text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
