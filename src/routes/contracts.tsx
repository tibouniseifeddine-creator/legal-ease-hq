import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowRight, Plus, FileText, Loader2, X, AlertCircle, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Contract = Tables<"contracts">;
type Client = Tables<"clients">;
type Property = Tables<"properties">;

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  rental: "إيجار",
  promise_to_sell: "وعد بالبيع",
  other: "أخرى",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", cls: "bg-sky-100 text-sky-700" },
  pending_signature: { label: "بانتظار التوقيع", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "مكتمل", cls: "bg-emerald-100 text-emerald-700" },
};

function contractsQueryOptions(organizationId: string) {
  return {
    queryKey: ["contracts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contract[];
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

function propertiesListQueryOptions(organizationId: string) {
  return {
    queryKey: ["properties-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", organizationId)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  };
}

export const Route = createFileRoute("/contracts")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(contractsQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(clientsListQueryOptions(context.organization.id)),
      context.queryClient.ensureQueryData(propertiesListQueryOptions(context.organization.id)),
    ]);
  },
  head: () => ({
    meta: [{ title: "العقود — NexLaw" }],
  }),
  component: ContractsPage,
});

function generateContractText(params: {
  type: string;
  officeName: string;
  clientName: string;
  clientNationalId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyArea: number | null;
  price: number | null;
  date: string;
}): string {
  const { type, officeName, clientName, clientNationalId, propertyTitle, propertyAddress, propertyArea, price, date } = params;
  const areaText = propertyArea ? `بمساحة ${propertyArea} متر مربع، ` : "";
  const priceText = price ? `${price.toLocaleString("ar-DZ")} دج` : "[المبلغ]";
  const addressText = propertyAddress || "[العنوان]";
  const propTitle = propertyTitle || "[العقار]";
  const clientBase = clientName || "[اسم الطرف الثاني]";
  const client = clientNationalId ? `${clientBase}، حامل بطاقة التعريف الوطنية رقم ${clientNationalId}` : clientBase;
  const office = officeName || "[اسم المكتب]";

  if (type === "rental") {
    return `عقد إيجار

المادة الأولى: يؤجّر ${office} (الطرف الأول) للسيد/ة ${client} (الطرف الثاني) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: مدة الإيجار سنة واحدة قابلة للتجديد، تبدأ من تاريخ ${date}.
المادة الثالثة: تم الاتفاق على بدل إيجار شهري قدره ${priceText}، يُدفع في بداية كل شهر.
المادة الرابعة: يلتزم المستأجر بالمحافظة على العقار وإعادته بالحالة التي استلمه عليها.
المادة الخامسة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.`;
  }

  if (type === "promise_to_sell") {
    return `عقد وعد بالبيع

المادة الأولى: يعد ${office} (الطرف الأول) بالبيع للسيد/ة ${client} (الطرف الثاني) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: تم الاتفاق على ثمن إجمالي قدره ${priceText}.
المادة الثالثة: يلتزم الطرفان بإبرام العقد النهائي خلال مدة أقصاها ثلاثة أشهر من تاريخ ${date}.
المادة الرابعة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.`;
  }

  if (type === "other") {
    return `عقد

بين: ${office} (الطرف الأول)
و: ${client} (الطرف الثاني)

بخصوص: ${propTitle}
بتاريخ: ${date}

[أضف بنود العقد هنا]`;
  }

  return `عقد بيع

المادة الأولى: يبيع ${office} (الطرف الأول/البائع) للسيد/ة ${client} (الطرف الثاني/المشتري) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: تم الاتفاق على ثمن قدره ${priceText}، يُدفع حسب الاتفاق بين الطرفين.
المادة الثالثة: يلتزم البائع بتسليم العقار خاليًا من كل شاغل وحق للغير.
المادة الرابعة: تُنقل الملكية إلى المشتري فور التوقيع على هذا العقد ودفع كامل الثمن.
المادة الخامسة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.

حرر بتاريخ: ${date}`;
}

function ContractsPage() {
  const { organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: contracts } = useSuspenseQuery(contractsQueryOptions(organization.id));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const { data: properties } = useSuspenseQuery(propertiesListQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold-foreground" />
            </div>
            <div>
              <div className="font-bold text-navy">العقود</div>
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
          <div className="text-sm text-muted-foreground">{contracts.length} عقد</div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold text-gold-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-95 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "إلغاء" : "عقد جديد"}
          </button>
        </div>

        {showForm && (
          <NewContractForm
            organizationId={organization.id}
            organizationName={organization.name}
            clients={clients}
            properties={properties}
            onDone={() => setShowForm(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["contracts", organization.id] });
              queryClient.invalidateQueries({ queryKey: ["clients-list", organization.id] });
              queryClient.invalidateQueries({ queryKey: ["properties-list", organization.id] });
            }}
          />
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {contracts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">لا يوجد عقود بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">اضغط "عقد جديد" لإنشاء أول عقد لمكتبك.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40">
                  <th className="text-right font-medium px-5 py-3">العقد</th>
                  <th className="text-right font-medium px-5 py-3">النوع</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                  <th className="text-right font-medium px-5 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{c.title}</td>
                      <td className="px-5 py-3 text-muted-foreground">{TYPE_LABELS[c.contract_type] ?? c.contract_type}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">{c.contract_date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function NewContractForm({
  organizationId,
  organizationName,
  clients,
  properties,
  onDone,
  onCreated,
}: {
  organizationId: string;
  organizationName: string;
  clients: Client[];
  properties: Property[];
  onDone: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("sale");
  const [status, setStatus] = useState("draft");
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [clientNationalId, setClientNationalId] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [propertyPrice, setPropertyPrice] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [contractDate, setContractDate] = useState(today);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = clients.find((c) => c.id === clientId);
    setClientNationalId(client?.national_id ?? "");
    setClientPhone(client?.phone ?? "");
  }, [clientId, clients]);

  useEffect(() => {
    const property = properties.find((p) => p.id === propertyId);
    setPropertyPrice(property?.price != null ? String(property.price) : "");
    setPropertyArea(property?.area != null ? String(property.area) : "");
  }, [propertyId, properties]);

  const handleGenerate = () => {
    const client = clients.find((c) => c.id === clientId);
    const property = properties.find((p) => p.id === propertyId);
    const text = generateContractText({
      type: contractType,
      officeName: organizationName,
      clientName: client?.full_name ?? "",
      clientNationalId: clientNationalId.trim(),
      propertyTitle: property?.title ?? "",
      propertyAddress: property ? [property.address, property.city].filter(Boolean).join("، ") : "",
      propertyArea: propertyArea.trim() ? Number(propertyArea) : null,
      price: propertyPrice.trim() ? Number(propertyPrice) : null,
      date: contractDate,
    });
    setContent(text);
    if (!title.trim() && property) {
      setTitle(`${TYPE_LABELS[contractType]} — ${property.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: TablesInsert<"contracts"> = {
      organization_id: organizationId,
      title: title.trim(),
      contract_type: contractType,
      status,
      client_id: clientId || null,
      property_id: propertyId || null,
      content: content.trim() || null,
      contract_date: contractDate,
    };

    const { error: insertError } = await supabase.from("contracts").insert(payload);

    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    if (clientId) {
      const original = clients.find((c) => c.id === clientId);
      const newNationalId = clientNationalId.trim() || null;
      const newPhone = clientPhone.trim() || null;
      if (original && (newNationalId !== (original.national_id ?? null) || newPhone !== (original.phone ?? null))) {
        await supabase
          .from("clients")
          .update({ national_id: newNationalId, phone: newPhone })
          .eq("id", clientId);
      }
    }

    if (propertyId) {
      const original = properties.find((p) => p.id === propertyId);
      const newPrice = propertyPrice.trim() ? Number(propertyPrice) : null;
      const newArea = propertyArea.trim() ? Number(propertyArea) : null;
      if (original && (newPrice !== original.price || newArea !== original.area)) {
        await supabase
          .from("properties")
          .update({ price: newPrice, area: newArea })
          .eq("id", propertyId);
      }
    }

    setLoading(false);
    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h2 className="font-bold text-navy">عقد جديد</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="عنوان العقد" value={title} onChange={setTitle} required placeholder="مثال: بيع شقة سكنية" />
        <div>
          <label className="text-sm font-semibold text-navy">النوع</label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
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
        <Field label="التاريخ" value={contractDate} onChange={setContractDate} type="date" />
        <div>
          <label className="text-sm font-semibold text-navy">العميل</label>
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
        <div>
          <label className="text-sm font-semibold text-navy">العقار</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            <option value="">— بدون —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {clientId && (
          <>
            <Field label="رقم هوية العميل" value={clientNationalId} onChange={setClientNationalId} placeholder="يُحفظ في سجل العميل عند التعديل" />
            <Field label="هاتف العميل" value={clientPhone} onChange={setClientPhone} />
          </>
        )}
        {propertyId && (
          <>
            <Field label="سعر العقار (دج)" value={propertyPrice} onChange={setPropertyPrice} type="number" />
            <Field label="مساحة العقار (م²)" value={propertyArea} onChange={setPropertyArea} type="number" />
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-navy">نص العقد</label>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 text-xs text-sky-600 font-semibold hover:underline"
          >
            <Wand2 className="w-3.5 h-3.5" />
            توليد النص تلقائيًا
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="اضغط «توليد النص تلقائيًا» بعد اختيار النوع والعميل والعقار، أو اكتب النص يدويًا."
          className="w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-4 text-sm font-mono leading-relaxed resize-y"
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
        {loading ? "جاري الحفظ..." : "حفظ العقد"}
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
