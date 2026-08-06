import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-navy text-white">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-xl font-extrabold text-gold">NexLaw</div>
          <div className="mt-1 text-xs text-white/60 truncate">{organization.name}</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active ? "bg-gold text-gold-foreground font-semibold" : "text-white/75 hover:bg-white/10"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="m-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-card border-b border-border px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-navy truncate">{title}</h1>
            {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-navy truncate max-w-[180px]">{user.email ?? "مستخدم"}</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{organization.name}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
