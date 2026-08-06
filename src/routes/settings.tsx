import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Settings as SettingsIcon, Loader2, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";

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

type OrgMember = { membership_id: string; user_id: string; role: string; email: string; joined_at: string };

function orgMembersQueryOptions(organizationId: string) {
  return {
    queryKey: ["org-members", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_org_members", { org_id: organizationId });
      if (error) throw error;
      return (data ?? []) as OrgMember[];
    },
  };
}

function orgInvitesQueryOptions(organizationId: string) {
  return {
    queryKey: ["org-invites", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export const Route = createFileRoute("/settings")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
      context.queryClient.ensureQueryData(orgMembersQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(orgInvitesQueryOptions(context.organization.id)),
    ]);
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
  const { data: members } = useSuspenseQuery(orgMembersQueryOptions(organization.id));
  const { data: invites } = useSuspenseQuery(orgInvitesQueryOptions(organization.id));
  const canEditOrg = role === "owner" || role === "admin";

  const [orgName, setOrgName] = useState(organization.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) || "";

  const handleCreateInvite = async (inviteRole: "admin" | "member") => {
    setCreatingInvite(true);
    const code = crypto.randomUUID().replace(/-/g, "");
    await supabase.from("organization_invites").insert({
      organization_id: organization.id,
      code,
      role: inviteRole,
      created_by: user.id,
    });
    setCreatingInvite(false);
    queryClient.invalidateQueries({ queryKey: ["org-invites", organization.id] });
  };

  const handleDeactivateInvite = async (inviteId: string) => {
    await supabase.from("organization_invites").update({ is_active: false }).eq("id", inviteId);
    queryClient.invalidateQueries({ queryKey: ["org-invites", organization.id] });
  };

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
    <AppShell user={user} organization={organization} title="الإعدادات" subtitle="إعدادات المكتب والحساب">

      <div className="max-w-2xl mx-auto space-y-6">
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
          <h2 className="font-bold text-navy mb-4">الفريق</h2>

          <ul className="divide-y divide-border -mx-6">
            {members.map((m) => (
              <li key={m.membership_id} className="px-6 py-3 flex items-center justify-between text-sm">
                <span className="font-medium">{m.email}</span>
                <span className="text-xs text-muted-foreground">
                  {m.role === "owner" ? "مالك" : m.role === "admin" ? "مدير" : "عضو"}
                </span>
              </li>
            ))}
          </ul>

          {canEditOrg && (
            <div className="mt-5 pt-5 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">دعوة عضو جديد</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCreateInvite("member")}
                    disabled={creatingInvite}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent disabled:opacity-50"
                  >
                    كعضو
                  </button>
                  <button
                    onClick={() => handleCreateInvite("admin")}
                    disabled={creatingInvite}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent disabled:opacity-50"
                  >
                    كمدير
                  </button>
                </div>
              </div>

              {invites.filter((i) => i.is_active).length > 0 && (
                <ul className="space-y-2">
                  {invites.filter((i) => i.is_active).map((inv) => (
                    <li key={inv.id} className="flex items-center gap-2 text-xs bg-muted/60 rounded-lg p-2.5">
                      <span className="flex-1 truncate font-mono text-muted-foreground">
                        {window.location.origin}/join/{inv.code}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {inv.role === "admin" ? "مدير" : "عضو"}
                      </span>
                      <button
                        onClick={() => handleDeactivateInvite(inv.id)}
                        className="shrink-0 font-semibold text-red-600 hover:underline"
                      >
                        إلغاء
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-muted-foreground">
                شارك رابط الدعوة يدويًا (واتساب، بريد...). لا تنتهي صلاحيته، ويُستخدم مرة واحدة فقط — يمكنك إلغاؤه في أي وقت.
              </p>
            </div>
          )}
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
      </div>
    </AppShell>
  );
}
