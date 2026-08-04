import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckSquare, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

const TYPE_LABELS: Record<string, string> = {
  task: "مهمة",
  appointment: "موعد",
  reminder: "تذكير",
};

function tasksQueryOptions(organizationId: string) {
  return {
    queryKey: ["tasks", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("is_done", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  };
}

export const Route = createFileRoute("/tasks")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tasksQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [
      { title: "المهام والمواعيد — NexLaw" },
      { name: "description", content: "تابع مهام مكتبك ومواعيدك القادمة في مكان واحد." },
      { property: "og:title", content: "المهام والمواعيد — NexLaw" },
      { property: "og:description", content: "تابع مهام مكتبك ومواعيدك القادمة في مكان واحد." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks", organization.id] });

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("tasks").update({ is_done: !current }).eq("id", id);
    invalidate();
  };

  return (
    <AppShell user={user} organization={organization} title="المهام والمواعيد" subtitle={`${tasks.length} عنصر`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "مهمة أو موعد جديد"}
          </button>
        </div>

        {showForm && (
          <NewTaskForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={invalidate}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="لا توجد مهام بعد" hint="أضف أول مهمة أو موعد لمكتبك." />
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={t.is_done}
                    onChange={() => toggle(t.id, t.is_done)}
                    className="w-4 h-4 accent-[var(--color-gold)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.is_done ? "line-through text-muted-foreground" : "text-navy"}`}>
                      {t.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABELS[t.task_type] ?? t.task_type}
                      {t.due_at ? ` · ${new Date(t.due_at).toLocaleString("ar-DZ")}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NewTaskForm({
  organizationId, onDone, onCreated,
}: { organizationId: string; onDone: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("task");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      title: title.trim(),
      task_type: taskType,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">عنصر جديد</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="text-sm font-semibold text-navy">العنوان</label>
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: موعد مع العميل"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={taskType} onChange={(e) => setTaskType(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">التاريخ والوقت</label>
          <input
            type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit" disabled={loading || !title.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
