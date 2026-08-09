import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, CalendarCheck, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type Client = Tables<"clients">;

function taskDetailQueryOptions(taskId: string) {
  return {
    queryKey: ["task-detail", taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (error) throw error;
      return data as Task;
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

function myRoleQueryOptions(organizationId: string, userId: string) {
  return {
    queryKey: ["my-role", organizationId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data.role as string;
    },
  };
}

export const Route = createFileRoute("/tasks/$taskId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(taskDetailQueryOptions(params.taskId)),
      context.queryClient.ensureQueryData(clientsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "تفاصيل المهمة — NexLaw" }],
  }),
  component: TaskDetailPage,
});

function formatDueAt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-DZ", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TaskDetailPage() {
  const { user, organization } = Route.useRouteContext();
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: task } = useSuspenseQuery(taskDetailQueryOptions(taskId));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canDelete = role === "owner" || role === "admin";
  const client = clients.find((c) => c.id === task.client_id);

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["task-detail", taskId] });

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    navigate({ to: "/tasks" });
  };

  const toggleDone = async () => {
    await supabase.from("tasks").update({ is_done: !task.is_done }).eq("id", taskId);
    invalidate();
  };

  return (
    <AppShell user={user} organization={organization} title={task.title} subtitle={organization.name}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/tasks" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            <ArrowRight className="w-4 h-4" />
            العودة لكل المهام والمواعيد
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-accent"
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? "إلغاء التعديل" : "تعديل"}
            </button>
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <EditTaskForm
            task={task}
            clients={clients}
            onDone={() => setEditing(false)}
            onSaved={() => {
              invalidate();
              setEditing(false);
            }}
          />
        ) : (
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`font-bold text-navy text-lg truncate ${task.is_done ? "line-through" : ""}`}>{task.title}</h1>
                <div className="text-xs text-muted-foreground">{task.task_type === "task" ? "مهمة" : "موعد"}</div>
              </div>
              {task.task_type === "task" && (
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
                  <input type="checkbox" checked={task.is_done} onChange={toggleDone} className="accent-[color:var(--gold)] w-4 h-4" />
                  منجزة
                </label>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">التاريخ والوقت: </span>{formatDueAt(task.due_at)}</div>
              <div><span className="text-muted-foreground">العميل: </span>{client?.full_name || "—"}</div>
            </div>
            {task.notes && (
              <p className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">{task.notes}</p>
            )}
          </section>
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy mb-2">حذف {task.task_type === "task" ? "المهمة" : "الموعد"}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هل أنت متأكد أنك تريد حذف "{task.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm mb-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl h-11 font-bold hover:brightness-95 transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "جاري الحذف..." : "حذف نهائيًا"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-muted rounded-xl h-11 font-bold hover:bg-accent transition disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EditTaskForm({
  task,
  clients,
  onDone,
  onSaved,
}: {
  task: Task;
  clients: Client[];
  onDone: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [taskType, setTaskType] = useState<"task" | "appointment">(task.task_type as "task" | "appointment");
  const [dueAt, setDueAt] = useState(toLocalInputValue(task.due_at));
  const [clientId, setClientId] = useState(task.client_id ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesUpdate<"tasks"> = {
      title: title.trim(),
      task_type: taskType,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      client_id: clientId || null,
      notes: notes.trim() || null,
    };

    const { error: updateError } = await supabase.from("tasks").update(payload).eq("id", task.id);
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">تعديل</h2>
        <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="العنوان" value={title} onChange={setTitle} required />
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
          label="التاريخ والوقت"
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
          rows={3}
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
        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
