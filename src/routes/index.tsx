import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Home, Users, Building2, FileText, FolderClosed, CheckSquare,
  Calendar, Receipt, BarChart3, Settings, Search, Bell, Mail,
  Menu, Plus, FolderOpen, MoreVertical, ChevronLeft, Sparkles,
  AlertTriangle, ClipboardList, FilePlus, Building, UploadCloud,
  HomeIcon, StickyNote, CalendarPlus, Bot, Brain, ScanSearch, LogOut,
} from "lucide-react";
import heroImg from "@/assets/hero-handshake.jpg";
import robotImg from "@/assets/ai-robot.png";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";

export const Route = createFileRoute("/")({
  beforeLoad: requireOrgSession,
  component: Dashboard,
});

const navItems: Array<{ icon: typeof Home; label: string; active?: boolean; to?: string }> = [
  { icon: Home, label: "لوحة التحكم", active: true },
  { icon: Users, label: "العملاء", to: "/clients" },
  { icon: Building2, label: "العقارات", to: "/properties" },
  { icon: FileText, label: "العقود" },
  { icon: FolderClosed, label: "الوثائق" },
  { icon: CheckSquare, label: "المهام" },
  { icon: Calendar, label: "المواعيد" },
  { icon: Receipt, label: "الفواتير" },
  { icon: BarChart3, label: "التقارير" },
  { icon: Settings, label: "الإعدادات" },
];

const stats = [
  { label: "العملاء", value: "128", delta: "12%", up: true, icon: Users, tint: "bg-indigo-100 text-indigo-600" },
  { label: "العقود", value: "56", delta: "8%", up: true, icon: FileText, tint: "bg-amber-100 text-amber-600" },
  { label: "قيد المراجعة", value: "18", delta: "4%", up: false, icon: AlertTriangle, tint: "bg-yellow-100 text-yellow-600" },
  { label: "المواعيد اليوم", value: "7", delta: "16%", up: true, icon: Calendar, tint: "bg-sky-100 text-sky-600" },
];

const clients = [
  { name: "أحمد بن علي", activity: "منذ ساعتين", initials: "أ", color: "bg-indigo-500" },
  { name: "فاطمة الزهراء", activity: "أمس", initials: "ف", color: "bg-rose-500" },
  { name: "محمد بوعبدالله", activity: "منذ 3 أيام", initials: "م", color: "bg-emerald-500" },
  { name: "شركة الأمل العقارية", activity: "منذ 5 أيام", initials: "ش", color: "bg-amber-500" },
];

const contracts = [
  { name: "بيع شقة سكنية", type: "بيع", date: "2024/05/20", status: "مكتمل", statusClass: "bg-emerald-100 text-emerald-700" },
  { name: "إيجار محل تجاري", type: "إيجار", date: "2024/05/19", status: "قيد المراجعة", statusClass: "bg-sky-100 text-sky-700" },
  { name: "وعد بالبيع", type: "وعد بالبيع", date: "2024/05/18", status: "بانتظار التوقيع", statusClass: "bg-amber-100 text-amber-700" },
  { name: "بيع أرض فلاحية", type: "بيع", date: "2024/05/17", status: "مكتمل", statusClass: "bg-emerald-100 text-emerald-700" },
];

const alerts = [
  { dot: "bg-red-500", title: "عقد بيع شقة في الجزائر", subtitle: "ينقصه بند طريقة الدفع" },
  { dot: "bg-amber-500", title: "وثيقة هوية منتهية الصلاحية", subtitle: "لدى العميل أحمد بن علي" },
  { dot: "bg-sky-500", title: "موعد اليوم 11:00 ص", subtitle: "مع العميل فاطمة الزهراء" },
];

const quickActions: Array<{ icon: typeof FilePlus; label: string; to?: string; highlight?: boolean }> = [
  { icon: ScanSearch, label: "مراجعة عقد بالذكاء", to: "/contract-review", highlight: true },
  { icon: FilePlus, label: "إنشاء عقد بيع" },
  { icon: Building, label: "إنشاء عقد إيجار" },
  { icon: UploadCloud, label: "رفع وثيقة" },
  { icon: HomeIcon, label: "أضف عقار" },
  { icon: CalendarPlus, label: "موعد جديد" },
];

function Dashboard() {
  const { user, organization } = Route.useRouteContext();
  const navigate = useNavigate();
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user.email ||
    "مستخدم";
  const initials = displayName.trim().charAt(0) || "؟";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
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
                  <button className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-5 py-3 text-sm font-semibold hover:brightness-95 transition shadow-sm">
                    <Plus className="w-4 h-4" /> عقد جديد
                  </button>
                  <button className="inline-flex items-center gap-2 bg-navy text-navy-foreground rounded-xl px-5 py-3 text-sm font-semibold hover:brightness-110 transition">
                    <Plus className="w-4 h-4" /> عميل جديد
                  </button>
                  <button className="inline-flex items-center gap-2 bg-background border border-border rounded-xl px-5 py-3 text-sm font-semibold hover:bg-muted transition">
                    <FolderOpen className="w-4 h-4" /> فتح عميل
                  </button>
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
                {stats.map((s) => (
                  <div key={s.label} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">{s.label}</div>
                        <div className="text-3xl font-extrabold mt-2 text-navy">{s.value}</div>
                        <div className={`text-xs mt-2 font-semibold ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                          {s.up ? "↑" : "↓"} {s.delta}
                        </div>
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
                    <button className="text-xs text-sky-600 font-semibold hover:underline">عرض الكل</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground bg-muted/40">
                        <th className="text-right font-medium px-5 py-2.5">العميل</th>
                        <th className="text-right font-medium px-5 py-2.5">آخر نشاط</th>
                        <th className="text-right font-medium px-5 py-2.5">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.name} className="border-t border-border">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${c.color} text-white flex items-center justify-center text-xs font-bold`}>{c.initials}</div>
                              <span className="font-medium">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{c.activity}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-xs px-3 py-1 rounded-md bg-muted hover:bg-accent font-medium">فتح</button>
                              <button className="p-1 hover:bg-muted rounded"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Contracts */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2 font-bold text-navy">
                      <FileText className="w-4 h-4" />
                      آخر العقود
                    </div>
                    <button className="text-xs text-sky-600 font-semibold hover:underline">عرض الكل</button>
                  </div>
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
                      {contracts.map((c) => (
                        <tr key={c.name + c.date} className="border-t border-border">
                          <td className="px-5 py-3 font-medium">{c.name}</td>
                          <td className="px-5 py-3 text-muted-foreground">{c.type}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${c.statusClass}`}>{c.status}</span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground tabular-nums">{c.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                      لديك 3 تنبيهات تحتاج إلي انتباهك
                    </p>
                  </div>
                  <img src={robotImg} alt="AI" width={80} height={80} className="w-20 h-20 object-contain -mt-2 -ml-2" loading="lazy" />
                </div>

                <div className="space-y-2 mt-4">
                  {alerts.map((a) => (
                    <button key={a.title} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 transition rounded-xl p-3 text-right">
                      <ChevronLeft className="w-4 h-4 text-white/60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{a.title}</div>
                        <div className="text-[11px] text-white/60 truncate mt-0.5">{a.subtitle}</div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${a.dot} shrink-0`} />
                    </button>
                  ))}
                </div>

                <button className="w-full mt-4 bg-gold text-gold-foreground font-semibold text-sm rounded-xl py-2.5 hover:brightness-95 transition">
                  عرض جميع التنبيهات
                </button>
              </div>

              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 justify-end mb-3">
                  <span className="font-bold text-navy">المهام اليوم</span>
                  <ClipboardList className="w-4 h-4 text-gold" />
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 justify-end">
                    <span>مراجعة عقد بيع الجزائر</span>
                    <input type="checkbox" className="accent-[color:var(--gold)]" />
                  </li>
                  <li className="flex items-center gap-2 justify-end text-muted-foreground line-through">
                    <span>الاتصال بالعميل أحمد</span>
                    <input type="checkbox" defaultChecked className="accent-[color:var(--gold)]" />
                  </li>
                  <li className="flex items-center gap-2 justify-end">
                    <span>رفع وثائق فاطمة</span>
                    <input type="checkbox" className="accent-[color:var(--gold)]" />
                  </li>
                </ul>
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
