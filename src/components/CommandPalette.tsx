import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, Building2, FileText, CheckSquare, Receipt, FolderClosed, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ResultItem = { id: string; label: string; sublabel?: string; to: string; params?: Record<string, string> };
type ResultGroup = { key: string; label: string; icon: typeof Users; items: ResultItem[] };

async function runSearch(organizationId: string, query: string): Promise<ResultGroup[]> {
  const pattern = `%${query}%`;

  const [clients, properties, contracts, tasks, invoices, documents] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone").eq("organization_id", organizationId).ilike("full_name", pattern).limit(5),
    supabase.from("properties").select("id, title, city").eq("organization_id", organizationId).ilike("title", pattern).limit(5),
    supabase.from("contracts").select("id, title, contract_type").eq("organization_id", organizationId).ilike("title", pattern).limit(5),
    supabase.from("tasks").select("id, title").eq("organization_id", organizationId).ilike("title", pattern).limit(5),
    supabase.from("invoices").select("id, title, amount").eq("organization_id", organizationId).ilike("title", pattern).limit(5),
    supabase.from("documents").select("id, title").eq("organization_id", organizationId).ilike("title", pattern).limit(5),
  ]);

  const groups: ResultGroup[] = [
    {
      key: "clients", label: "العملاء", icon: Users,
      items: (clients.data ?? []).map((c) => ({ id: c.id, label: c.full_name, sublabel: c.phone ?? undefined, to: "/clients/$clientId", params: { clientId: c.id } })),
    },
    {
      key: "properties", label: "العقارات", icon: Building2,
      items: (properties.data ?? []).map((p) => ({ id: p.id, label: p.title, sublabel: p.city ?? undefined, to: "/properties" })),
    },
    {
      key: "contracts", label: "العقود", icon: FileText,
      items: (contracts.data ?? []).map((c) => ({ id: c.id, label: c.title, to: "/contracts" })),
    },
    {
      key: "tasks", label: "المهام والمواعيد", icon: CheckSquare,
      items: (tasks.data ?? []).map((t) => ({ id: t.id, label: t.title, to: "/tasks" })),
    },
    {
      key: "invoices", label: "الفواتير", icon: Receipt,
      items: (invoices.data ?? []).map((i) => ({ id: i.id, label: i.title, sublabel: `${Number(i.amount).toLocaleString("ar-DZ")} دج`, to: "/invoices" })),
    },
    {
      key: "documents", label: "الوثائق", icon: FolderClosed,
      items: (documents.data ?? []).map((d) => ({ id: d.id, label: d.title, to: "/documents" })),
    },
  ];

  return groups.filter((g) => g.items.length > 0);
}

export function CommandPalette({ organizationId }: { organizationId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setGroups([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      const result = await runSearch(organizationId, query.trim());
      if (!cancelled) {
        setGroups(result);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, open, organizationId]);

  const handleSelect = (item: ResultItem) => {
    setOpen(false);
    navigate({ to: item.to, params: item.params });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 hover:bg-muted rounded-xl px-3 h-9 transition"
      >
        <Search className="w-4 h-4" />
        <span>بحث...</span>
        <span className="text-[10px] border border-border rounded px-1.5 py-0.5 mr-1">⌘K</span>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-24 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border w-full max-w-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن عميل، عقار، عقد، مهمة، فاتورة، وثيقة..."
                className="flex-1 bg-transparent focus:outline-none text-sm"
              />
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">اكتب حرفين على الأقل للبحث.</p>
              ) : loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">جاري البحث...</p>
              ) : groups.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
              ) : (
                groups.map((group) => (
                  <div key={group.key} className="p-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      <group.icon className="w-3.5 h-3.5" />
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full text-right px-3 py-2 rounded-lg hover:bg-muted transition flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-medium truncate">{item.label}</span>
                        {item.sublabel && <span className="text-xs text-muted-foreground shrink-0">{item.sublabel}</span>}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
