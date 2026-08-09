import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, Building2, Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const TYPE_LABELS: Record<string, string> = {
  apartment: "شقة",
  house: "منزل",
  land: "أرض",
  commercial: "محل تجاري",
  office: "مكتب",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  available: { label: "متاح", cls: "bg-emerald-100 text-emerald-700" },
  reserved: { label: "محجوز", cls: "bg-amber-100 text-amber-700" },
  sold: { label: "مباع", cls: "bg-sky-100 text-sky-700" },
  rented: { label: "مؤجّر", cls: "bg-indigo-100 text-indigo-700" },
};

function propertiesQueryOptions(organizationId: string) {
  return {
    queryKey: ["properties", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  };
}

export const Route = createFileRoute("/properties/")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(propertiesQueryOptions(context.organization.id));
  },
  head: () => ({
    meta: [{ title: "العقارات — NexLaw" }],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: properties } = useSuspenseQuery(propertiesQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell user={user} organization={organization} title="العقارات" subtitle="قائمة العقارات المسجّلة">

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{properties.length} عقار</div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "عقار جديد"}
          </button>
        </div>

        {showForm && (
          <NewPropertyForm
            organizationId={organization.id}
            onDone={() => setShowForm(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["properties", organization.id] })}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {properties.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد عقارات بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">اضغط "عقار جديد" لإضافة أول عقار لمكتبك.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-xs text-muted-foreground bg-muted/40">
                    <th className="text-right font-medium px-5 py-3">العقار</th>
                    <th className="text-right font-medium px-5 py-3">النوع</th>
                    <th className="text-right font-medium px-5 py-3">المدينة</th>
                    <th className="text-right font-medium px-5 py-3">السعر</th>
                    <th className="text-right font-medium px-5 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => {
                    const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.available;
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-5 py-3 font-medium">
                          <Link to="/properties/$propertyId" params={{ propertyId: p.id }} className="hover:underline">
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{TYPE_LABELS[p.property_type] ?? p.property_type}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.city || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground tabular-nums">
                          {p.price != null ? Number(p.price).toLocaleString("ar-DZ") : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NewPropertyForm({
  organizationId,
  onDone,
  onCreated,
}: {
  organizationId: string;
  onDone: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [status, setStatus] = useState("available");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesInsert<"properties"> = {
      organization_id: organizationId,
      title: title.trim(),
      property_type: propertyType,
      status,
      price: price.trim() ? Number(price) : null,
      area: area.trim() ? Number(area) : null,
      city: city.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: insertError } = await supabase.from("properties").insert(payload);
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
      <h2 className="font-bold text-navy">عقار جديد</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="عنوان العقار" value={title} onChange={setTitle} required placeholder="مثال: شقة سكنية بحي النصر" />
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-navy">الحالة</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <Field label="السعر (دج)" value={price} onChange={setPrice} type="number" placeholder="15000000" />
        <Field label="المساحة (م²)" value={area} onChange={setArea} type="number" placeholder="90" />
        <Field label="المدينة" value={city} onChange={setCity} placeholder="مثال: الجزائر العاصمة" />
        <Field label="العنوان التفصيلي" value={address} onChange={setAddress} />
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
        {loading ? "جاري الحفظ..." : "حفظ العقار"}
      </button>
    </form>
  );
}
