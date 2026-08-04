import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Home, Users, Building2, FileText, FolderClosed, CheckSquare,
  Calendar, Receipt, BarChart3, Settings, Brain, LogOut, ScanSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { icon: Home, label: "لوحة التحكم", to: "/" },
  { icon: Users, label: "العملاء", to: "/clients" },
  { icon: Building2, label: "العقارات", to: "/properties" },
  { icon: FileText, label: "العقود", to: "/contracts" },
  { icon: FolderClosed, label: "الوثائق", to: "/documents" },
  { icon: CheckSquare, label: "المهام والمواعيد", to: "/tasks" },
  { icon: Receipt, label: "الفواتير", to: "/invoices" },
  { icon: BarChart3, label: "التقارير", to: "/reports" },
  { icon: ScanSearch, label: "مراجعة عقد بالذكاء", to: "/contract-review" },
  { icon: Settings, label: "الإعدادات", to: "/settings" },
] as const;

export function AppShell({
  user,
  organization,
  title,
  subtitle,
  actions,
  children,
}: {
  user: User;
  organization: { name: string };
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
      <aside className="w-64 shrink-0 bg-navy text-navy-foreground flex flex-col min-h-screen sticky top-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
              <Home className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">NexLaw</div>
              <div className="text-[10px] text-white/60 mt-1">Legal &amp; Real Estate Workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-gold text-gold-foreground shadow-sm"
                    : "text-white/80 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
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
          <Link
            to="/assistant"
            className="w-full inline-flex items-center justify-center bg-gold text-gold-foreground rounded-lg py-2 text-xs font-semibold hover:brightness-95 transition"
          >
            تحدث مع الذكاء الاصطناعي
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-navy text-lg truncate">{title}</h1>
              <div className="text-xs text-muted-foreground truncate">
                {subtitle ?? organization.name}
              </div>
            </div>
            {actions}
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-navy leading-none">{displayName}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{organization.name}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-navy text-navy-foreground flex items-center justify-center font-bold">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                title="تسجيل الخروج"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: typeof Home; title: string; hint: string }) {
  return (
    <div className="p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gold" />
      </div>
      <h2 className="mt-4 font-bold text-navy text-lg">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
