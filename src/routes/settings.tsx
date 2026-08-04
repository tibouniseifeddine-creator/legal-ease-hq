import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Settings as SettingsIcon, Loader2, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";

const PLAN_LABELS: Record<string, string> = {
  basic: "أساسية", professional: "احترافية", enterprise: "مؤسسات",
};

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

export const Route = createFileRoute("/settings")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      myRoleQueryOptions(context.organization.id, context.user.id),
    );
  },
  head: () => ({
    meta: [{ title: "الإعدادات — NexLaw" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, organization } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canEditOrg = role === "owner" || role === "admin";

  const [orgName, setOrgName] = useState(organization.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) || "";

  const handleSaveOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ name: orgName.trim() })
      .eq("id", organization.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    queryClient.invalidateQueries({ queryKey: ["my-role", organization.id, user.id] });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">الإعدادات</div>
              <div className="text-xs text-muted-foreground">{organization.name}</div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-navy mb-4">المكتب</h2>

          {canEditOrg ? (
            <form onSubmit={handleSaveOrgName} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy">اسم المكتب</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>تم الحفظ.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !orgName.trim() || orgName.trim() === organization.name}
                className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "جاري الحفظ..." : "حفظ"}
              </button>
            </form>
          ) : (
            <div>
              <div className="text-sm font-semibold text-navy">اسم المكتب</div>
              <div className="mt-2 text-sm text-muted-foreground">{organization.name}</div>
              <p className="mt-3 text-xs text-muted-foreground">
                تعديل اسم المكتب متاح فقط لمالك المكتب أو مدير فيه.
              </p>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-border">
            <div className="text-sm font-semibold text-navy">الخطة الحالية</div>
            <div className="mt-1 text-sm text-muted-foreground">{PLAN_LABELS[organization.plan] ?? organization.plan}</div>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-navy mb-4">حسابي</h2>
          <div className="space-y-3 text-sm">
            {displayName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الاسم</span>
                <span className="font-medium">{displayName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">البريد الإلكتروني</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الدور في المكتب</span>
              <span className="font-medium">{role === "owner" ? "مالك" : role === "admin" ? "مدير" : "عضو"}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </section>
      </main>
    </div>
  );
}
