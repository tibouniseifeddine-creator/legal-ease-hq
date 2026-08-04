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

const navItems: Array<{ icon: typeof Home; label: string; active?: boolean; to?: string }> = [
  { icon: Home, label: "لوحة التحكم", active: true },
  { icon: Users, label: "العملاء", to: "/clients" },
  { icon: Building2, label: "العقارات", to: "/properties" },
  { icon: FileText, label: "العقود", to: "/contracts" },
  { icon: FolderClosed, label: "الوثائق", to: "/documents" },
  { icon: CheckSquare, label: "المهام", to: "/tasks" },
  { icon: Calendar, label: "المواعيد", to: "/tasks" },
  { icon: Receipt, label: "الفواتير", to: "/invoices" },
  { icon: BarChart3, label: "التقارير", to: "/reports" },
  { icon: Settings, label: "الإعدادات", to: "/settings" },
];

const statMeta = [
  { key: "clients" as const, label: "العملاء", icon: Users, tint: "bg-indigo-100 text-indigo-600" },
  { key: "contracts" as const, label: "العقود", icon: FileText, tint: "bg-amber-100 text-amber-600" },
  { key: "pendingReview" as const, label: "قيد المراجعة", icon: AlertTriangle, tint: "bg-yellow-100 text-yellow-600" },
  { key: "appointmentsToday" as const, label: "المواعيد اليوم", icon: Calendar, tint: "bg-sky-100 text-sky-600" },
];

const quickActions: Array<{ icon: typeof FilePlus; label: string; to?: string; highlight?: boolean }> = [
  { icon: ScanSearch, label: "مراجعة عقد بالذكاء", to: "/contract-review", highlight: true },
  { icon: FilePlus, label: "إنشاء عقد بيع", to: "/contracts" },
  { icon: Building, label: "إنشاء عقد إيجار", to: "/contracts" },
  { icon: UploadCloud, label: "رفع وثيقة", to: "/documents" },
  { icon: HomeIcon, label: "أضف عقار", to: "/properties" },
  { icon: CalendarPlus, label: "موعد جديد", to: "/tasks" },
];

function Dashboard() {
  const { user, organization } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: alerts } = useSuspenseQuery(alertsQueryOptions(organization.id));
  const { data: recentClients } = useSuspenseQuery(recentClientsQueryOptions(organization.id));
  const { data: recentContracts } = useSuspenseQuery(recentContractsQueryOptions(organization.id));
  const { data: pendingTasks } = useSuspenseQuery(pendingTasksQueryOptions(organization.id));
  const { data: dashboardStats } = useSuspenseQuery(dashboardStatsQueryOptions(organization.id));
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user.email ||
    "مستخدم";
  const initials = displayName.trim().charAt(0) || "؟";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const toggleTaskDone = async (taskId: string, current: boolean) => {
    await supabase.from("tasks").update({ is_done: !current }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["pending-tasks", organization.id] });
  };

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-navy text-navy-foreground flex flex-col min-h-screen sticky top-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
              <Home className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">NexLaw</div>
              <div className="text-[10px] text-white/60 mt-1">Legal & Real Estate Workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const cls = [
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              item.active
                ? "bg-gold text-gold-foreground shadow-sm"
                : "text-white/80 hover:bg-white/5 hover:text-white",
            ].join(" ");
            const inner = (
              <>
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </>
            );
            return item.to ? (
              <Link key={item.label} to={item.to} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={item.label} className={cls}>
                {inner}
              </button>
            );
          })}
        </nav>

        <div className="m-3 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm font-bold">NexLaw AI</div>
            <Brain className="w-6 h-6 text-gold" />
          </div>
          <p className="text-xs text-white/70 leading-relaxed mb-3">
            مساعدك الذكي لإنجاز الأعمال القانونية بسرعة ودقة
          </p>
          <button className="w-full bg-gold text-gold-foreground rounded-lg py-2 text-xs font-semibold hover:brightness-95 transition">
            تحدث مع الذكاء الاصطناعي
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 px-6 py-4">
            <button className="p-2 rounded-lg hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 max-w-2xl relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث عن عميل، عقد، أو وثيقة..."
                className="w-full h-11 rounded-full bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none pr-10 pl-4 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-full hover:bg-muted">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
              </button>
              <button className="relative p-2 rounded-full hover:bg-muted">
                <Mail className="w-5 h-5" />
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
              </button>
              <div className="flex items-center gap-3 pr-2 border-r border-border">
                <div className="text-right leading-tight">
                  <div className="text-sm font-bold">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{organization.name}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-navy text-navy-foreground flex items-center justify-center font-bold">{initials}</div>
                <button
                  onClick={handleSignOut}
                  title="تسجيل الخروج"
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-red-600 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-white to-amber-50 border border-border">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-8 md:p-10 z-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-navy leading-tight">
                  <span className="inline-block">مرحبًا بك،</span> {displayName} <span>👋</span>
                </h1>
                <p className="mt-3 text-muted-foreground max-w-md">
                  منصتك الذكية لإدارة العملاء والعقود والوثائق في مكان واحد
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/contracts" className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-5 py-3 text-sm font-semibold hover:brightness-95 transition shadow-sm">
                    <Plus className="w-4 h-4" /> عقد جديد
                  </Link>
                  <Link to="/clients" className="inline-flex items-center gap-2 bg-navy text-navy-foreground rounded-xl px-5 py-3 text-sm font-semibold hover:brightness-110 transition">
                    <Plus className="w-4 h-4" /> عميل جديد
                  </Link>
                  <Link to="/clients" className="inline-flex items-center gap-2 bg-background border border-border rounded-xl px-5 py-3 text-sm font-semibold hover:bg-muted transition">
                    <FolderOpen className="w-4 h-4" /> فتح عميل
                  </Link>
                </div>
              </div>
              <div className="relative h-56 md:h-72">
                <img
                  src={heroImg}
                  alt="صفقة عقارية"
                  width={1600}
                  height={600}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/30 to-white" />
              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6 min-w-0">
              {/* Stats */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statMeta.map((s) => (
                  <div key={s.key} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">{s.label}</div>
                        <div className="text-3xl font-extrabold mt-2 text-navy tabular-nums">{dashboardStats[s.key]}</div>
                      </div>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${s.tint}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Tables */}
              <section className="grid md:grid-cols-2 gap-6">
                {/* Clients */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2 font-bold text-navy">
                      <Users className="w-4 h-4" />
                      آخر العملاء
                    </div>
                    <Link to="/clients" className="text-xs text-sky-600 font-semibold hover:underline">عرض الكل</Link>
                  </div>
                  {recentClients.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد عملاء بعد.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground bg-muted/40">
                          <th className="text-right font-medium px-5 py-2.5">العميل</th>
                          <th className="text-right font-medium px-5 py-2.5">أُضيف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentClients.map((c, i) => (
                          <tr key={c.id} className="border-t border-border">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                  {c.full_name.trim().charAt(0) || "؟"}
                                </div>
                                <span className="font-medium">{c.full_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{timeAgo(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Contracts */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2 font-bold text-navy">
                      <FileText className="w-4 h-4" />
                      آخر العقود
                    </div>
                    <Link to="/contracts" className="text-xs text-sky-600 font-semibold hover:underline">عرض الكل</Link>
                  </div>
                  {recentContracts.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد عقود بعد.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground bg-muted/40">
                          <th className="text-right font-medium px-5 py-2.5">العقد</th>
                          <th className="text-right font-medium px-5 py-2.5">النوع</th>
                          <th className="text-right font-medium px-5 py-2.5">الحالة</th>
                          <th className="text-right font-medium px-5 py-2.5">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentContracts.map((c) => {
                          const st = CONTRACT_STATUS_STYLES[c.status] ?? CONTRACT_STATUS_STYLES.draft;
                          return (
                            <tr key={c.id} className="border-t border-border">
                              <td className="px-5 py-3 font-medium">{c.title}</td>
                              <td className="px-5 py-3 text-muted-foreground">{CONTRACT_TYPE_LABELS[c.contract_type] ?? c.contract_type}</td>
                              <td className="px-5 py-3">
                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="px-5 py-3 text-muted-foreground tabular-nums">{c.contract_date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              {/* Quick actions */}
              <section className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4 justify-end">
                  <span className="font-bold text-navy">اختصارات سريعة</span>
                  <Sparkles className="w-4 h-4 text-gold" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {quickActions.map((a) => {
                    const cls = [
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition group",
                      a.highlight
                        ? "border-gold bg-gradient-to-b from-amber-50 to-white hover:brightness-95"
                        : "border-border hover:border-gold hover:bg-amber-50/50",
                    ].join(" ");
                    const inner = (
                      <>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${a.highlight ? "bg-gold text-gold-foreground" : "bg-muted text-navy group-hover:bg-gold/20"}`}>
                          <a.icon className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-semibold text-center">{a.label}</div>
                      </>
                    );
                    return a.to ? (
                      <Link key={a.label} to={a.to} className={cls}>{inner}</Link>
                    ) : (
                      <button key={a.label} className={cls}>{inner}</button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* AI Alerts panel */}
            <aside className="space-y-4">
              <div className="bg-navy text-navy-foreground rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles className="w-4 h-4 text-gold" />
                      NexLaw AI
                    </div>
                    <p className="text-xs text-white/70 mt-2 max-w-[10rem]">
                      {alerts.length > 0
                        ? `لديك ${alerts.length} تنبيهات تحتاج إلى انتباهك`
                        : "لا توجد تنبيهات تحتاج انتباهك الآن"}
                    </p>
                  </div>
                  <img src={robotImg} alt="AI" width={80} height={80} className="w-20 h-20 object-contain -mt-2 -ml-2" loading="lazy" />
                </div>

                {alerts.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {alerts.map((a) => (
                      <div key={a.id} className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-3 text-right">
                        <ChevronLeft className="w-4 h-4 text-white/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{a.title}</div>
                          <div className="text-[11px] text-white/60 truncate mt-0.5">{a.subtitle}</div>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${a.dot} shrink-0`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 justify-end mb-3">
                  <span className="font-bold text-navy">مهام معلّقة</span>
                  <ClipboardList className="w-4 h-4 text-gold" />
                </div>
                {pendingTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد مهام معلّقة 🎉</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {pendingTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 justify-end">
                        <span>{t.title}</span>
                        <input
                          type="checkbox"
                          checked={t.is_done}
                          onChange={() => toggleTaskDone(t.id, t.is_done)}
                          className="accent-[color:var(--gold)]"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Link to="/contract-review" className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-2xl p-4 hover:bg-muted transition text-sm font-semibold">
                <Bot className="w-4 h-4 text-gold" />
                اسأل مساعد NexLaw لمراجعة عقد
              </Link>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
