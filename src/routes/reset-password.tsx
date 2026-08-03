import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "إعادة تعيين كلمة المرور — NexLaw" }],
  }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gold flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">كلمة مرور جديدة</h1>
            <p className="text-xs text-muted-foreground">اختر كلمة مرور جديدة لحسابك</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-navy">كلمة المرور الجديدة</label>
            <div className="relative mt-2">
              <input
                type={show ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none pr-4 pl-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                tabIndex={-1}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
            disabled={loading || password.trim().length < 6}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-12 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
}
