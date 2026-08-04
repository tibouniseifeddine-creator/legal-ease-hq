import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderClosed, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell, EmptyState } from "@/components/AppShell";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

function documentsQueryOptions(organizationId: string) {
  return {
    queryKey: ["documents", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Document[];
    },
  };
}

export const Route = createFileRoute("/documents")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(documentsQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [
      { title: "الوثائق — NexLaw" },
      { name: "description", content: "نظّم وثائق مكتبك واربطها بالعملاء والعقود." },
      { property: "og:title", content: "الوثائق — NexLaw" },
      { property: "og:description", content: "نظّم وثائق مكتبك واربطها بالعملاء والعقود." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: documents } = useSuspenseQuery(documentsQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell user={user} organization={organization} title="الوثائق" subtitle={`${documents.length} وثيقة`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "وثيقة جديدة"}
          </button>
        </div>

        {showForm && (
          <NewDocumentForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["documents", organization.id] })}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {documents.length === 0 ? (
            <EmptyState icon={FolderClosed} title="لا توجد وثائق بعد" hint='اضغط "وثيقة جديدة" لتسجيل أول وثيقة.' />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">الوثيقة</th>
                  <th className="text-right font-medium px-5 py-3">النوع</th>
                  <th className="text-right font-medium px-5 py-3">المسار</th>
                  <th className="text-right font-medium px-5 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{d.title}</td>
                    <td className="px-5 py-3 text-muted-foreground">{d.file_type || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground truncate max-w-xs">{d.file_path}</td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      {new Date(d.created_at).toLocaleDateString("ar-DZ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NewDocumentForm({
  organizationId, onDone, onCreated,
}: { organizationId: string; onDone: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileType, setFileType] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from("documents").insert({
      organization_id: organizationId,
      title: title.trim(),
      file_path: filePath.trim(),
      file_type: fileType.trim() || null,
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">وثيقة جديدة</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-navy">عنوان الوثيقة</label>
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: بطاقة هوية العميل"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">المسار أو الرابط</label>
          <input
            required value={filePath} onChange={(e) => setFilePath(e.target.value)}
            placeholder="documents/id-card.pdf"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">نوع الملف</label>
          <input
            value={fileType} onChange={(e) => setFileType(e.target.value)}
            placeholder="pdf"
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">ملاحظات</label>
          <input
            value={notes} onChange={(e) => setNotes(e.target.value)}
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
        type="submit" disabled={loading || !title.trim() || !filePath.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ الوثيقة"}
      </button>
    </form>
  );
}
