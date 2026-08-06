import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { ArrowRight, Plus, FolderClosed, Loader2, X, AlertCircle, Download, FileText as FileIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

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
    meta: [{ title: "الوثائق — NexLaw" }],
  }),
  component: DocumentsPage,
});

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function DocumentsPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: documents } = useSuspenseQuery(documentsQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents", organization.id] });

  const handleDownload = async (doc: Document) => {
    setError(null);
    const { data, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (urlError || !data) {
      setError("تعذّر إنشاء رابط التنزيل");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Document) => {
    setError(null);
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error: deleteError } = await supabase.from("documents").delete().eq("id", doc.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    invalidate();
  };

  return (
    <AppShell user={user} organization={organization} title="الوثائق" subtitle="سجل وثائق المكتب">

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{documents.length} وثيقة</div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "رفع وثيقة"}
          </button>
        </div>

        {showForm && (
          <UploadForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onUploaded={invalidate}
          />
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <FolderClosed className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد وثائق بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">اضغط "رفع وثيقة" لإضافة أول ملف لمكتبك.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((d) => (
                <li key={d.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatSize(d.file_size)}</div>
                  </div>
                  <button
                    onClick={() => handleDownload(d)}
                    title="تنزيل"
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-navy transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    title="حذف"
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function UploadForm({
  organizationId,
  onDone,
  onUploaded,
}: {
  organizationId: string;
  onDone: () => void;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("اختر ملفًا أولاً");
      return;
    }
    setLoading(true);
    setError(null);

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${organizationId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setLoading(false);
      setError(uploadError.message);
      return;
    }

    const payload: TablesInsert<"documents"> = {
      organization_id: organizationId,
      title: title.trim() || file.name,
      file_path: path,
      file_type: file.type || null,
      file_size: file.size,
    };

    const { error: insertError } = await supabase.from("documents").insert(payload);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onUploaded();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">رفع وثيقة جديدة</h2>

      <div>
        <label className="text-sm font-semibold text-navy">العنوان (اختياري)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: بطاقة هوية العميل أحمد"
          className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-navy">الملف</label>
        <input
          ref={fileInputRef}
          type="file"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 w-full text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-gold file:text-gold-foreground file:px-4 file:py-2 file:text-sm file:font-semibold"
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
        disabled={loading || !file}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الرفع..." : "رفع"}
      </button>
    </form>
  );
}
