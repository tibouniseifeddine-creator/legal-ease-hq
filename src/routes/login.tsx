import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — NexLaw" },
      { name: "description", content: "سجّل الدخول إلى منصة NexLaw لإدارة العملاء والعقود والوثائق." },
      { property: "og:title", content: "تسجيل الدخول — NexLaw" },
      { property: "og:description", content: "سجّل الدخول إلى منصة NexLaw لإدارة العملاء والعقود والوثائق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function PasswordField({
  label, value, onChange, autoComplete,
}: { label: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-sm font-semibold text-navy">{label}</label>
      <div className="relative mt-2">
        <input
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const ensureOrganization = async (name: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    if (membership) return true;
    const metadataOrgName =
      typeof userData.user.user_metadata?.org_name === "string" ? userData.user.user_metadata.org_name : "";
    const finalName = name.trim() || metadataOrgName.trim() || "مكتبي";
    const { error: rpcError } = await supabase.rpc("create_organization_with_owner", {
      org_name: finalName,
    });
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    return true;
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setInfo("إذا كان بريدك مسجّلاً لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, org_name: orgName.trim() },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setInfo("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد التسجيل ثم سجّل الدخول.");
          return;
        }
        if (!(await ensureOrganization(orgName))) return;
        navigate({ to: "/" });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!(await ensureOrganization(orgName))) return;
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إتمام العملية");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "signin" | "signup" | "forgot") => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gold flex items-center justify-center">
            <Home className="w-5 h-5 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">NexLaw</h1>
            <p className="text-xs text-muted-foreground">منصة العمل الذكية للمحامين والموثقين</p>
          </div>
        </div>

        {mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <h2 className="font-bold text-navy mb-1">استرجاع كلمة المرور</h2>
              <p className="text-xs text-muted-foreground">
                أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-navy">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{info}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-12 font-bold hover:brightness-95 transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              إرسال رابط الاسترجاع
            </button>

            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="w-full text-sm text-muted-foreground hover:text-navy"
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <Field required label="الاسم الكامل" value={fullName} onChange={setFullName} placeholder="مثال: أحمد بن علي" />
                  <Field label="اسم المكتب" value={orgName} onChange={setOrgName} placeholder="مثال: مكتب النصر للتوثيق" />
                </>
              )}
              <Field required label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
              <PasswordField
                label="كلمة المرور"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />

              {mode === "signin" && (
                <div className="-mt-2 text-left">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-sky-600 font-semibold hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{info}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-12 font-bold hover:brightness-95 transition disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
              </button>
            </form>

            <button
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-navy"
            >
              {mode === "signin" ? "ليس لديك حساب؟ أنشئ حسابًا جديدًا" : "لديك حساب؟ سجّل الدخول"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

