import { redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Organization = {
  id: string;
  name: string;
  plan: string;
};

export type OrgSessionContext = {
  user: User;
  organization: Organization;
};

/**
 * حارس المسارات: يتطلب جلسة مستخدم + انتماء لمكتب (organization).
 * يُستخدم في beforeLoad ويعمل على العميل فقط (defaultSsr: false).
 */
export async function requireOrgSession(): Promise<OrgSessionContext> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/login" });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organizations(id, name, plan)")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const organization = membership?.organizations as Organization | null | undefined;
  if (!organization) {
    throw redirect({ to: "/login" });
  }

  return { user: data.user, organization };
}
