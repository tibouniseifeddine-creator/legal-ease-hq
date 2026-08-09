import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Building2, Pencil, Trash2, Loader2, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/Field";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

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

function propertyDetailQueryOptions(propertyId: string) {
  return {
    queryKey: ["property-detail", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data as Property;
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

export const Route = createFileRoute("/properties/$propertyId")({
  beforeLoad: requireOrgSession,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(propertyDetailQueryOptions(params.propertyId)),
      context.queryClient.ensureQueryData(myRoleQueryOptions(context.organization.id, context.user.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "تفاصيل العقار — NexLaw" }],
  }),
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { user, organization } = Route.useRouteContext();
  const { propertyId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: property } = useSuspenseQuery(propertyDetailQueryOptions(propertyId));
  const { data: role } = useSuspenseQuery(myRoleQueryOptions(organization.id, user.id));
  const canDelete = role === "owner" || role === "admin";

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property-detail", propertyId] });

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from("properties").delete().eq("id", propertyId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    navigate({ to: "/properties" });
  };

  const st = STATUS_LABELS[property.status] ?? STATUS_LABELS.available;

  return (
    <AppShell user={user} organization={organization} title={property.title} subtitle={organization.name}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            <ArrowRight className="w-4 h-4" />
            العودة لكل العقارات
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
          <EditPropertyForm
            property={property}
            onDone={() => setEditing(false)}
            onSaved={() => {
              invalidate();
              setEditing(false);
            }}
          />
        ) : (
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-navy text-lg truncate">{property.title}</h1>
                <div className="text-xs text-muted-foreground">{TYPE_LABELS[property.property_type] ?? property.property_type}</div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${st.cls}`}>{st.label}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">السعر: </span>{property.price != null ? `${Number(property.price).toLocaleString("ar-DZ")} دج` : "—"}</div>
              <div><span className="text-muted-foreground">المساحة: </span>{property.area != null ? `${property.area} م²` : "—"}</div>
              <div><span className="text-muted-foreground">المدينة: </span>{property.city || "—"}</div>
              <div><span className="text-muted-foreground">العنوان: </span>{property.address || "—"}</div>
            </div>
            {property.notes && (
              <p className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">{property.notes}</p>
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
            <h3 className="font-bold text-navy mb-2">حذف العقار</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هل أنت متأكد أنك تريد حذف "{property.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
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

function EditPropertyForm({
  property,
  onDone,
  onSaved,
}: {
  property: Property;
  onDone: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(property.title);
  const [propertyType, setPropertyType] = useState(property.property_type);
  const [status, setStatus] = useState(property.status);
  const [price, setPrice] = useState(property.price != null ? String(property.price) : "");
  const [area, setArea] = useState(property.area != null ? String(property.area) : "");
  const [city, setCity] = useState(property.city ?? "");
  const [address, setAddress] = useState(property.address ?? "");
  const [notes, setNotes] = useState(property.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesUpdate<"properties"> = {
      title: title.trim(),
      property_type: propertyType,
      status,
      price: price.trim() ? Number(price) : null,
      area: area.trim() ? Number(area) : null,
      city: city.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: updateError } = await supabase.from("properties").update(payload).eq("id", property.id);
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
        <h2 className="font-bold text-navy">تعديل بيانات العقار</h2>
        <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

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
        <Field label="السعر (دج)" value={price} onChange={setPrice} type="number" />
        <Field label="المساحة (م²)" value={area} onChange={setArea} type="number" />
        <Field label="المدينة" value={city} onChange={setCity} />
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
        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
