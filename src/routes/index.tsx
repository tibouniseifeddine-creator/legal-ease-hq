import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Home, Users, Building2, FileText, FolderClosed, CheckSquare,
  Calendar, Receipt, BarChart3, Settings, Search, Bell, Mail,
  Menu, Plus, FolderOpen, ChevronLeft, Sparkles,
  AlertTriangle, ClipboardList, FilePlus, Building, UploadCloud,
  HomeIcon, StickyNote, CalendarPlus, Bot, Brain, ScanSearch, LogOut,
} from "lucide-react";
import heroImg from "@/assets/hero-handshake.jpg";
import robotImg from "@/assets/ai-robot.png";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";

type DashboardAlert = { id: string; dot: string; title: string; subtitle: string };

function alertsQueryOptions(organizationId: string) {
  return {
    queryKey: ["dashboard-alerts", organizationId],
    queryFn: async (): Promise<DashboardAlert[]> => {
      const today = new Date();
      const todayDateStr = today.toISOString().slice(0, 10);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const [overdueRes, appointmentsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, title, due_date")
          .eq("organization_id", organizationId)
          .in("status", ["unpaid", "overdue"])
          .lt("due_date", todayDateStr)
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("tasks")
          .select("id, title, due_at")
          .eq("organization_id", organizationId)
          .eq("task_type", "appointment")
          .gte("due_at", todayStart.toISOString())
          .lte("due_at", todayEnd.toISOString())
          .order("due_at", { ascending: true })
          .limit(5),
      ]);
      if (overdueRes.error) throw overdueRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      const result: DashboardAlert[] = [];
      for (const inv of overdueRes.data ?? []) {
        result.push({
          id: `inv-${inv.id}`,
          dot: "bg-red-500",
          title: inv.title,
          subtitle: `فاتورة متأخرة — استحقاقها ${inv.due_date}`,
        });
      }
      for (const t of appointmentsRes.data ?? []) {
        const time = t.due_at
          ? new Date(t.due_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
          : "";
        result.push({
          id: `task-${t.id}`,
          dot: "bg-sky-500",
          title: t.title,
          subtitle: time ? `موعد اليوم ${time}` : "موعد اليوم",
        });
      }
      return result;
    },
  };
}

function dashboardStatsQueryOptions(organizationId: string) {
  return {
    queryKey: ["dashboard-stats", organizationId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [clientsRes, contractsRes, pendingRes, apptRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("contracts").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "pending_review"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("task_type", "appointment")
          .gte("due_at", todayStart.toISOString())
          .lte("due_at", todayEnd.toISOString()),
      ]);
      if (clientsRes.error) throw clientsRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (apptRes.error) throw apptRes.error;

      return {
        clients: clientsRes.count ?? 0,
        contracts: contractsRes.count ?? 0,
        pendingReview: pendingRes.count ?? 0,
        appointmentsToday: apptRes.count ?? 0,
      };
    },
  };
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sale: "بيع", rental: "إيجار", promise_to_sell: "وعد بالبيع", other: "أخرى",
};
const CONTRACT_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", cls: "bg-sky-100 text-sky-700" },
  pending_signature: { label: "بانتظار التوقيع", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", cls: "bg-emerald-100 text-emerald-700" },
};
const AVATAR_COLORS = ["bg-indigo-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-purple-500"];

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "أمس";
  return `منذ ${diffDay} أيام`;
}

function recentClientsQueryOptions(organizationId: string) {
  return {
    queryKey: ["recent-clients", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  };
}

function recentContractsQueryOptions(organizationId: string) {
  return {
    queryKey: ["recent-contracts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, contract_type, status, contract_date")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  };
}

function pendingTasksQueryOptions(organizationId: string) {
  return {
    queryKey: ["pending-tasks", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, is_done, due_at")
        .eq("organization_id", organizationId)
        .eq("task_type", "task")
        .eq("is_done", false)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  };
}

export const Route = createFileRoute("/")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(alertsQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(recentClientsQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(recentContractsQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(pendingTasksQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(dashboardStatsQueryOptions(context.organization.id)),
    ]);
  },
  component: Dashboard,
});
