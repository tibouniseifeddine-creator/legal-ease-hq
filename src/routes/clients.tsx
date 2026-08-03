import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, Users, Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

function clientsQueryOptions(organizationId: string) {
  return {
    queryKey: ["clients", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  };
}

export const Route = createFileRoute("/clients")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(clientsQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [{ title: "العملاء — NexLaw" }],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: clients } = useSuspenseQuery(clientsQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <Users className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">العملاء</div>
              <div className="text-xs text-muted-foreground">{organization.name}</div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{clients.length} عميل</div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "عميل جديد"}
          </button>
        </div>

        {showForm && (
          <NewClientForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["clients", organization.id] })}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {clients.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <Users className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد عملاء بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">اضغط "عميل جديد" لإضافة أول عميل لمكتبك.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">الاسم</th>
                  <th className="text-right font-medium px-5 py-3">النوع</th>
                  <th className="text-right font-medium px-5 py-3">الهاتف</th>
                  <th className="text-right font-medium px-5 py-3">البريد الإلكتروني</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {c.full_name.trim().charAt(0) || "؟"}
                        </div>
                        <span className="font-medium">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.client_type === "company" ? "شركة" : "فرد"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">{c.phone || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function NewClientForm({
  organizationId,
  onDone,
  onCreated,
}: {
  organizationId: string;
  onDone: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [clientType, setClientType] = useState<"individual" | "company">("individual");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesInsert<"clients"> = {
      organization_id: organizationId,
      full_name: fullName.trim(),
      client_type: clientType,
      phone: phone.trim() || null,
      email: email.trim() || null,
      national_id: nationalId.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: insertError } = await supabase.from("clients").insert(payload);
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
      <h2 className="font-bold text-navy">عميل جديد</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم الكامل" value={fullName} onChange={setFullName} required placeholder="مثال: أحمد بن علي" />
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={clientType}
            onChange={(e) => setClientType(e.target.value as "individual" | "company")}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="individual">فرد</option>
            <option value="company">شركة</option>
          </select>
        </div>
        <Field label="الهاتف" value={phone} onChange={setPhone} placeholder="0555 12 34 56" />
        <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        <Field label="رقم الهوية / السجل التجاري" value={nationalId} onChange={setNationalId} />
        <Field label="العنوان" value={address} onChange={setAddress} />
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
        disabled={loading || !fullName.trim()}
        className="inline-flex items-center justify-center gap-2 bg-gold text-gold-foreground rounded-xl h-11 px-6 font-bold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "جاري الحفظ..." : "حفظ العميل"}
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
