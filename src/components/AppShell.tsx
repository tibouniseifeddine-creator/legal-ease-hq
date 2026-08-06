import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  FolderClosed,
  CheckSquare,
  Receipt,
  BarChart3,
  Bot,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Organization } from "@/lib/require-org-session";

const NAV_ITEMS = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/clients", label: "العملاء", icon: Users },
  { to: "/properties", label: "العقارات", icon: Building2 },
  { to: "/contracts", label: "العقود", icon: FileText },
  { to: "/documents", label: "الوثائق", icon: FolderClosed },
  { to: "/tasks", label: "المهام والمواعيد", icon: CheckSquare },
  { to: "/invoices", label: "الفواتير", icon: Receipt },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/assistant", label: "المساعد الذكي", icon: Bot },
  { to: "/contract-review", label: "مراجعة العقد", icon: ShieldCheck },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

const STORAGE_KEY = "nexlaw:sidebar-collapsed";

type AppShellProps = {
  user: { email?: string | null };
  organization: Organization;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ user, organization, title, subtitle, actions, children }: AppShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const email = user.email ?? "مستخدم";
  const initials = email.slice(0, 2).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className={`flex items-center gap-3 border-b border-white/10 px-4 py-5 ${collapsed ? "justify-center" : ""}`}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold text-gold-foreground font-extrabold">
          N
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-lg font-extrabold leading-none text-gold">NexLaw</div>
            <div className="mt-1 truncate text-[11px] text-white/60">{organization.name}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                collapsed ? "justify-center" : ""
              } ${active ? "bg-gold text-gold-foreground font-semibold" : "text-white/75 hover:bg-white/10"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        title="تسجيل الخروج"
        className={`m-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && "تسجيل الخروج"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background" dir="rtl">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 md:block ${collapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        <div className={`fixed inset-y-0 right-0 ${collapsed ? "w-[4.5rem]" : "w-64"} transition-[width] duration-200`}>
          {sidebar}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 right-0 w-64">
            {sidebar}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق"
              className="absolute left-2 top-4 rounded-lg p-2 text-white/70 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
              className="rounded-lg p-2 hover:bg-muted md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
              className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted md:inline-flex"
            >
              {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-navy sm:text-lg">{title}</h1>
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {actions}
            <div className="hidden text-right leading-tight sm:block">
              <div className="max-w-[160px] truncate text-xs font-semibold text-navy">{email}</div>
              <div className="max-w-[160px] truncate text-[11px] text-muted-foreground">{organization.name}</div>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-navy-foreground">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
