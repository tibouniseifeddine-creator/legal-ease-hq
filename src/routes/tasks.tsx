import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, CalendarCheck, Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Client = Tables<"clients">;

function tasksQueryOptions(organizationId: string) {
  return {
    queryKey: ["tasks", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  };
}

function clientsListQueryOptions(organizationId: string) {
  return {
    queryKey: ["clients-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  };
}

export const Route = createFileRoute("/tasks")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(tasksQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(clientsListQueryOptions(context.organization.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "المهام والمواعيد — NexLaw" }],
  }),
  component: TasksPage,
});

function formatDueAt(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleString("ar-DZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function TasksPage() {
  const { organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions(organization.id));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "task" | "appointment">("all");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks", organization.id] });

  const toggleDone = async (task: Task) => {
    await supabase.from("tasks").update({ is_done: !task.is_done }).eq("id", task.id);
    invalidate();
  };

  const filtered = tasks.filter((t) => filter === "all" || t.task_type === filter);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">المهام والمواعيد</div>
              <div className="text-xs text-muted-foreground">{organization.name}</div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl p-1">
            {[
              { value: "all", label: "الكل" },
              { value: "task", label: "المهام" },
              { value: "appointment", label: "المواعيد" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  filter === f.value ? "bg-card shadow-sm text-navy" : "text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "إضافة جديد"}
          </button>
        </div>

        {showForm && (
          <NewTaskForm
            organizationId={organization.id}
            clients={clients}
            onDone={() => setShowForm(false)}
            onCreated={invalidate}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <CalendarCheck className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد شيء هنا بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">اضغط "إضافة جديد" لإنشاء أول مهمة أو موعد.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((t) => {
                const client = clients.find((c) => c.id === t.client_id);
                const due = formatDueAt(t.due_at);
                return (
                  <li key={t.id} className="p-4 flex items-center gap-3">
                    {t.task_type === "task" ? (
                      <input
                        type="checkbox"
                        checked={t.is_done}
                        onChange={() => toggleDone(t)}
                        className="accent-[color:var(--gold)] w-4 h-4 shrink-0"
                      />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${t.is_done ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {due && <span className="tabular-nums">{due}</span>}
                        {client && <span>· {client.full_name}</span>}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0">
                      {t.task_type === "task" ? "مهمة" : "موعد"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function NewTaskForm({
  organizationId,
  clients,
  onDone,
  onCreated,
}: {
  organizationId: string;
  clients: Client[];
  onDone: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<"task" | "appointment">("task");
  const [dueAt, setDueAt] = useState("");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesInsert<"tasks"> = {
      organization_id: organizationId,
      title: title.trim(),
      task_type: taskType,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      client_id: clientId || null,
      notes: notes.trim() || null,
    };

    const { error: insertError } = await supabase.from("tasks").insert(payload);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">إضافة جديد</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="العنوان" value={title} onChange={setTitle} required placeholder="مثال: مراجعة عقد بيع الجزائر" />
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as "task" | "appointment")}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="task">مهمة</option>
            <option value="appointment">موعد</option>
          </select>
        </div>
        <Field
          label={taskType === "appointment" ? "التاريخ والوقت" : "التاريخ والوقت (اختياري)"}
          value={dueAt}
          onChange={setDueAt}
          type="datetime-local"
          required={taskType === "appointment"}
        />
        <div>
          <label className="text-sm font-semibold text-navy">العميل (اختياري)</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="">— بدون —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-navy">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-4 text-sm resize-y"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !title.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-semibold text-navy">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
      />
    </div>
  );
}
