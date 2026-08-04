import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [{ title: "الانضمام لمكتب — NexLaw" }],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "needs-auth" | "redeeming" | "success" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setStatus("needs-auth");
        return;
      }

      if (!cancelled) setStatus("redeeming");

      const { data, error: rpcError } = await supabase.rpc("redeem_invite", { invite_code: code });

      if (cancelled) return;

      if (rpcError) {
        setError(rpcError.message);
        setStatus("error");
        return;
      }

      setOrgName(data?.name ?? null);
      setStatus("success");
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-gold" />
        </div>

        {status === "checking" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...
          </div>
        )}

        {status === "needs-auth" && (
          <>
            <h1 className="mt-4 font-bold text-navy text-lg">سجّل دخولك أولاً</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              تحتاج حسابًا لتنضم إلى هذا المكتب. سجّل الدخول أو أنشئ حسابًا، ثم افتح هذا الرابط مرة أخرى.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition"
            >
              الذهاب لتسجيل الدخول
            </Link>
          </>
        )}

        {status === "redeeming" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> جاري الانضمام...
          </div>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mt-4 text-emerald-500" />
            <h1 className="mt-3 font-bold text-navy text-lg">تم الانضمام بنجاح</h1>
            {orgName && <p className="mt-2 text-sm text-muted-foreground">أصبحت الآن عضوًا في {orgName}.</p>}
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-6 inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition"
            >
              الذهاب للوحة التحكم
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm text-right">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Link to="/" className="mt-6 inline-block text-sm text-sky-600 font-semibold hover:underline">
              الذهاب للوحة التحكم
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
