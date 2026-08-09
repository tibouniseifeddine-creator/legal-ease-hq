import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, FileText, Loader2, X, AlertCircle, Wand2, Sparkles, BookOpen } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateContractDocument } from "@/lib/contract-generation.functions";
import { SUPPORTED_COUNTRIES } from "@/lib/legal-knowledge";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { Field } from "@/components/Field";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Contract = Tables<"contracts">;
type Client = Tables<"clients">;
type Property = Tables<"properties">;

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  rental: "إيجار",
  promise_to_sell: "وعد بالبيع",
  agency: "وكالة",
  other: "أخرى",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "شقة",
  house: "منزل",
  land: "أرض",
  commercial: "محل تجاري",
  office: "مكتب",
};

const ROLE_LABELS: Record<string, { a: string; b: string }> = {
  sale: { a: "البائع", b: "المشتري" },
  rental: { a: "المؤجر", b: "المستأجر" },
  promise_to_sell: { a: "الواعد بالبيع", b: "الموعود له" },
  agency: { a: "الموكِّل", b: "الوكيل" },
  other: { a: "الطرف الأول", b: "الطرف الثاني" },
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

export const Route = createFileRoute("/contracts/")({
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

export function generateContractText(p: {
  type: string;
  partyAName: string;
  partyANationalId: string;
  partyBName: string;
  partyBNationalId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyArea: number | null;
  price: number | null;
  date: string;
  witness1Name: string;
  witness1NationalId: string;
  witness2Name: string;
  witness2NationalId: string;
}): string {
  const roles = ROLE_LABELS[p.type] ?? ROLE_LABELS.other;
  const partyA = `${p.partyAName || `[${roles.a}]`}${p.partyANationalId ? `، حامل بطاقة التعريف الوطنية رقم ${p.partyANationalId}` : ""}`;
  const partyB = `${p.partyBName || `[${roles.b}]`}${p.partyBNationalId ? `، حامل بطاقة التعريف الوطنية رقم ${p.partyBNationalId}` : ""}`;
  const areaText = p.propertyArea ? `بمساحة ${p.propertyArea} متر مربع، ` : "";
  const priceText = p.price ? `${p.price.toLocaleString("ar-DZ")} دج` : "[المبلغ]";
  const addressText = p.propertyAddress || "[العنوان]";
  const propTitle = p.propertyTitle || "[العقار]";

  let body: string;
  if (p.type === "rental") {
    body = `عقد إيجار

المادة الأولى: يؤجّر السيد/ة ${partyA} (${roles.a}) للسيد/ة ${partyB} (${roles.b}) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: مدة الإيجار سنة واحدة قابلة للتجديد، تبدأ من تاريخ ${p.date}.
المادة الثالثة: تم الاتفاق على بدل إيجار شهري قدره ${priceText}، يُدفع في بداية كل شهر.
المادة الرابعة: يلتزم المستأجر بالمحافظة على العقار وإعادته بالحالة التي استلمه عليها.
المادة الخامسة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.`;
  } else if (p.type === "promise_to_sell") {
    body = `عقد وعد بالبيع

المادة الأولى: يعد السيد/ة ${partyA} (${roles.a}) بالبيع للسيد/ة ${partyB} (${roles.b}) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: تم الاتفاق على ثمن إجمالي قدره ${priceText}.
المادة الثالثة: يلتزم الطرفان بإبرام العقد النهائي خلال مدة أقصاها ثلاثة أشهر من تاريخ ${p.date}.
المادة الرابعة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.`;
  } else if (p.type === "agency") {
    body = `عقد وكالة

المادة الأولى: يوكِّل السيد/ة ${partyA} (${roles.a}) السيد/ة ${partyB} (${roles.b}) للقيام بجميع الإجراءات القانونية والإدارية اللازمة المتعلقة بالعقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}، بما في ذلك على سبيل المثال لا الحصر: التوقيع على العقود، ومتابعة الإجراءات لدى المصالح المختصة، واستلام وتسليم الوثائق.
المادة الثانية: هذه الوكالة سارية اعتبارًا من تاريخ ${p.date}.
المادة الثالثة: يلتزم الوكيل بأداء المهام الموكَلة إليه بأمانة وحسن نية، وفي حدود الصلاحيات الممنوحة له بموجب هذا العقد.
المادة الرابعة: للموكِّل الحق في إلغاء هذه الوكالة في أي وقت بإشعار كتابي.
المادة الخامسة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.`;
  } else if (p.type === "other") {
    body = `عقد

بين: ${partyA} (${roles.a})
و: ${partyB} (${roles.b})

بخصوص: ${propTitle}
بتاريخ: ${p.date}

[أضف بنود العقد هنا]`;
  } else {
    body = `عقد بيع

المادة الأولى: يبيع السيد/ة ${partyA} (${roles.a}) للسيد/ة ${partyB} (${roles.b}) العقار المسمى "${propTitle}"، ${areaText}الكائن بـ ${addressText}.
المادة الثانية: تم الاتفاق على ثمن قدره ${priceText}، يُدفع حسب الاتفاق بين الطرفين.
المادة الثالثة: يلتزم البائع بتسليم العقار خاليًا من كل شاغل وحق للغير.
المادة الرابعة: تُنقل الملكية إلى المشتري فور التوقيع على هذا العقد ودفع كامل الثمن.
المادة الخامسة: كل نزاع ينشأ عن هذا العقد يخضع للمحاكم المختصة.

حرر بتاريخ: ${p.date}`;
  }

  const witnessLines = [
    p.witness1Name ? `الشاهد الأول: ${p.witness1Name}${p.witness1NationalId ? `، حامل بطاقة رقم ${p.witness1NationalId}` : ""}` : "",
    p.witness2Name ? `الشاهد الثاني: ${p.witness2Name}${p.witness2NationalId ? `، حامل بطاقة رقم ${p.witness2NationalId}` : ""}` : "",
  ].filter(Boolean);

  const witnessBlock = witnessLines.length > 0 ? `\n\nالشهود:\n${witnessLines.join("\n")}` : "";

  const signatures = `\n\nالتوقيعات:\n${roles.a}: ..........................          ${roles.b}: ..........................${
    witnessLines.length > 0 ? "\nالشاهد الأول: ..........................          الشاهد الثاني: .........................." : ""
  }`;

  return body + witnessBlock + signatures;
}

function ContractsPage() {
  const { organization } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contracts } = useSuspenseQuery(contractsQueryOptions(organization.id));
  const { data: clients } = useSuspenseQuery(clientsListQueryOptions(organization.id));
  const { data: properties } = useSuspenseQuery(propertiesListQueryOptions(organization.id));
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gold-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-navy truncate">العقود</div>
              <div className="text-xs text-muted-foreground truncate">{organization.name}</div>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy shrink-0">
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">العودة للوحة التحكم</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
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
                     <tr
                        key={c.id}
                        onClick={() => navigate({ to: "/contracts/$contractId", params: { contractId: c.id } })}
                        className="border-t border-border hover:bg-muted/30 active:bg-muted/50 cursor-pointer"
                      >
                        <td className="px-5 py-3 font-medium">
                          <span className="hover:underline">{c.title}</span>
                        </td>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NameAutocomplete({
  label, value, onChange, clients, onMatch, listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  clients: Client[];
  onMatch: (client: Client | null) => void;
  listId: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-navy">{label}</label>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          onMatch(clients.find((c) => c.full_name === v) ?? null);
        }}
        placeholder="اكتب الاسم أو اختره من الاقتراحات"
        className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
      />
      <datalist id={listId}>
        {clients.map((c) => (
          <option key={c.id} value={c.full_name} />
        ))}
      </datalist>
    </div>
  );
}

function PropertyTitleAutocomplete({
  value, onChange, properties, onMatch,
}: {
  value: string;
  onChange: (v: string) => void;
  properties: Property[];
  onMatch: (property: Property | null) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-navy">اسم العقار</label>
      <input
        type="text"
        list="properties-datalist"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          onMatch(properties.find((p) => p.title === v) ?? null);
        }}
        placeholder="اكتب اسم العقار أو اختره من الاقتراحات"
        className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
      />
      <datalist id="properties-datalist">
        {properties.map((p) => (
          <option key={p.id} value={p.title} />
        ))}
      </datalist>
    </div>
  );
}

function NewContractForm({
  organizationId,
  clients,
  properties,
  onDone,
  onCreated,
}: {
  organizationId: string;
  clients: Client[];
  properties: Property[];
  onDone: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("sale");
  const [country, setCountry] = useState("DZ");
  const [extraNotes, setExtraNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genInfo, setGenInfo] = useState<{ sources: string[]; missingData: string[] } | null>(null);
  const generateDoc = useServerFn(generateContractDocument);
  const [status, setStatus] = useState("draft");
  const [clientId, setClientId] = useState("");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [propertyCity, setPropertyCity] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyPrice, setPropertyPrice] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [matchedPropertyId, setMatchedPropertyId] = useState<string | null>(null);
  const [contractDate, setContractDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [partyAName, setPartyAName] = useState("");
  const [partyANationalId, setPartyANationalId] = useState("");
  const [partyAPhone, setPartyAPhone] = useState("");
  const [partyBName, setPartyBName] = useState("");
  const [partyBNationalId, setPartyBNationalId] = useState("");
  const [partyBPhone, setPartyBPhone] = useState("");
  const [witness1Name, setWitness1Name] = useState("");
  const [witness1NationalId, setWitness1NationalId] = useState("");
  const [witness2Name, setWitness2Name] = useState("");
  const [witness2NationalId, setWitness2NationalId] = useState("");

  const roles = ROLE_LABELS[contractType] ?? ROLE_LABELS.other;

  const handlePropertyMatch = (property: Property | null) => {
    if (!property) {
      setMatchedPropertyId(null);
      return;
    }
    setMatchedPropertyId(property.id);
    setPropertyType(property.property_type);
    setPropertyCity(property.city ?? "");
    setPropertyAddress(property.address ?? "");
    setPropertyPrice(property.price != null ? String(property.price) : "");
    setPropertyArea(property.area != null ? String(property.area) : "");
  };

  const fillFromClient = (client: Client | null, setNationalId: (v: string) => void, setPhone: (v: string) => void) => {
    if (!client) return;
    setNationalId(client.national_id ?? "");
    setPhone(client.phone ?? "");
  };

  const fillWitnessFromClient = (client: Client | null, setNationalId: (v: string) => void) => {
    if (!client) return;
    setNationalId(client.national_id ?? "");
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setGenInfo(null);
    try {
      const res = await generateDoc({
        data: {
          country,
          contractType,
          title: title.trim() || null,
          contractDate,
          endDate: endDate || null,
          partyA: { name: partyAName.trim(), nationalId: partyANationalId.trim(), phone: partyAPhone.trim() },
          partyB: { name: partyBName.trim(), nationalId: partyBNationalId.trim(), phone: partyBPhone.trim() },
          property: {
            title: propertyTitle.trim(),
            type: propertyType,
            city: propertyCity.trim(),
            address: propertyAddress.trim(),
            area: propertyArea.trim() ? Number(propertyArea) : null,
            price: propertyPrice.trim() ? Number(propertyPrice) : null,
          },
          witnesses: [
            { name: witness1Name.trim(), nationalId: witness1NationalId.trim() },
            { name: witness2Name.trim(), nationalId: witness2NationalId.trim() },
          ].filter((w) => w.name),
          extraNotes: extraNotes.trim() || null,
        },
      });
      if (!res.available) {
        setGenError(res.message);
        return;
      }
      setContent(res.content);
      setGenInfo({ sources: res.sources, missingData: res.missingData });
      if (!title.trim() && propertyTitle.trim()) {
        setTitle(`${TYPE_LABELS[contractType]} — ${propertyTitle.trim()}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر توليد العقد";
      setGenError(
        message.includes("429") ? "تم تجاوز الحد المسموح، جرب لاحقًا."
        : message.includes("402") ? "رصيد الذكاء الاصطناعي غير كافٍ."
        : message,
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    const text = generateContractText({
      type: contractType,
      partyAName: partyAName.trim(),
      partyANationalId: partyANationalId.trim(),
      partyBName: partyBName.trim(),
      partyBNationalId: partyBNationalId.trim(),
      propertyTitle: propertyTitle.trim(),
      propertyAddress: [propertyAddress.trim(), propertyCity.trim()].filter(Boolean).join("، "),
      propertyArea: propertyArea.trim() ? Number(propertyArea) : null,
      price: propertyPrice.trim() ? Number(propertyPrice) : null,
      date: contractDate,
      witness1Name: witness1Name.trim(),
      witness1NationalId: witness1NationalId.trim(),
      witness2Name: witness2Name.trim(),
      witness2NationalId: witness2NationalId.trim(),
    });
    setContent(text);
    if (!title.trim() && propertyTitle.trim()) {
      setTitle(`${TYPE_LABELS[contractType]} — ${propertyTitle.trim()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let finalPropertyId: string | null = null;

    if (propertyTitle.trim()) {
      const matched = matchedPropertyId ? properties.find((p) => p.id === matchedPropertyId) : null;
      const stillMatches = matched && matched.title === propertyTitle.trim();
      const newPrice = propertyPrice.trim() ? Number(propertyPrice) : null;
      const newArea = propertyArea.trim() ? Number(propertyArea) : null;

      if (stillMatches && matched) {
        finalPropertyId = matched.id;
        if (
          newPrice !== matched.price ||
          newArea !== matched.area ||
          propertyCity.trim() !== (matched.city ?? "") ||
          propertyAddress.trim() !== (matched.address ?? "") ||
          propertyType !== matched.property_type
        ) {
          await supabase
            .from("properties")
            .update({
              property_type: propertyType,
              city: propertyCity.trim() || null,
              address: propertyAddress.trim() || null,
              price: newPrice,
              area: newArea,
            })
            .eq("id", matched.id);
        }
      } else {
        const { data: newProperty, error: propertyError } = await supabase
          .from("properties")
          .insert({
            organization_id: organizationId,
            title: propertyTitle.trim(),
            property_type: propertyType,
            city: propertyCity.trim() || null,
            address: propertyAddress.trim() || null,
            price: newPrice,
            area: newArea,
          })
          .select()
          .single();

        if (propertyError) {
          setLoading(false);
          setError(propertyError.message);
          return;
        }
        finalPropertyId = newProperty.id;
      }
    }

    const payload: TablesInsert<"contracts"> = {
      organization_id: organizationId,
      title: title.trim(),
      contract_type: contractType,
      country,
      status,
      client_id: clientId || null,
      property_id: finalPropertyId,
      content: content.trim() || null,
      contract_date: contractDate,
      end_date: endDate || null,
      party_a_name: partyAName.trim() || null,
      party_a_national_id: partyANationalId.trim() || null,
      party_a_phone: partyAPhone.trim() || null,
      party_b_name: partyBName.trim() || null,
      party_b_national_id: partyBNationalId.trim() || null,
      party_b_phone: partyBPhone.trim() || null,
      witness1_name: witness1Name.trim() || null,
      witness1_national_id: witness1NationalId.trim() || null,
      witness2_name: witness2Name.trim() || null,
      witness2_national_id: witness2NationalId.trim() || null,
    };

    const { error: insertError } = await supabase.from("contracts").insert(payload);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
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
          <label className="text-sm font-semibold text-navy">البلد (المرجع القانوني)</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}{c.available ? "" : " — الحزمة القانونية غير متوفرة"}
              </option>
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
        <Field label="تاريخ الانتهاء (اختياري)" value={endDate} onChange={setEndDate} type="date" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
        <div>
          <label className="text-sm font-semibold text-navy">العميل المرتبط (اختياري، لأرشفة العقد فقط)</label>
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

      <div className="pt-2 border-t border-border">
        <h3 className="text-sm font-bold text-navy mb-3">العقار</h3>
        <p className="text-xs text-muted-foreground mb-3">
          اكتب اسم عقار موجود لتُملأ بياناته تلقائيًا، أو اسم عقار جديد ليُحفَظ تلقائيًا في صفحة العقارات عند حفظ العقد.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <PropertyTitleAutocomplete
            value={propertyTitle}
            onChange={(v) => {
              setPropertyTitle(v);
              if (matchedPropertyId) {
                const stillMatches = properties.find((p) => p.id === matchedPropertyId)?.title === v;
                if (!stillMatches) setMatchedPropertyId(null);
              }
            }}
            properties={properties}
            onMatch={handlePropertyMatch}
          />
          <div>
            <label className="text-sm font-semibold text-navy">النوع</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="mt-2 w-full h-11 rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none px-4 text-sm"
            >
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Field label="المدينة" value={propertyCity} onChange={setPropertyCity} placeholder="مثال: الجزائر العاصمة" />
          <Field label="العنوان التفصيلي" value={propertyAddress} onChange={setPropertyAddress} />
          <Field label="السعر (دج)" value={propertyPrice} onChange={setPropertyPrice} type="number" />
          <Field label="المساحة (م²)" value={propertyArea} onChange={setPropertyArea} type="number" />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="text-sm font-bold text-navy mb-3">{roles.a} (الطرف الأول)</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <NameAutocomplete
            label="الاسم"
            value={partyAName}
            onChange={setPartyAName}
            clients={clients}
            onMatch={(c) => fillFromClient(c, setPartyANationalId, setPartyAPhone)}
            listId="clients-datalist-a"
          />
          <Field label="رقم الهوية" value={partyANationalId} onChange={setPartyANationalId} />
          <Field label="الهاتف" value={partyAPhone} onChange={setPartyAPhone} />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="text-sm font-bold text-navy mb-3">{roles.b} (الطرف الثاني)</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <NameAutocomplete
            label="الاسم"
            value={partyBName}
            onChange={setPartyBName}
            clients={clients}
            onMatch={(c) => fillFromClient(c, setPartyBNationalId, setPartyBPhone)}
            listId="clients-datalist-b"
          />
          <Field label="رقم الهوية" value={partyBNationalId} onChange={setPartyBNationalId} />
          <Field label="الهاتف" value={partyBPhone} onChange={setPartyBPhone} />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="text-sm font-bold text-navy mb-3">الشهود (اختياري)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <NameAutocomplete
              label="الشاهد الأول"
              value={witness1Name}
              onChange={setWitness1Name}
              clients={clients}
              onMatch={(c) => fillWitnessFromClient(c, setWitness1NationalId)}
              listId="clients-datalist-w1"
            />
            <Field label="رقم الهوية" value={witness1NationalId} onChange={setWitness1NationalId} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NameAutocomplete
              label="الشاهد الثاني"
              value={witness2Name}
              onChange={setWitness2Name}
              clients={clients}
              onMatch={(c) => fillWitnessFromClient(c, setWitness2NationalId)}
              listId="clients-datalist-w2"
            />
            <Field label="رقم الهوية" value={witness2NationalId} onChange={setWitness2NationalId} />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-navy">نص العقد</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold hover:underline"
            >
              <Wand2 className="w-3.5 h-3.5" />
              نموذج سريع
            </button>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-xs bg-navy text-navy-foreground rounded-lg px-3 py-1.5 font-bold disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-gold" />}
              {generating ? "جاري تحرير العقد..." : "توليد عقد كامل"}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs font-semibold text-muted-foreground">تفاصيل إضافية للتوليد (اختياري)</label>
          <textarea
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            rows={2}
            placeholder="مثال: الدفع على ثلاثة أقساط، التسليم بعد شهرين، وجود رهن سابق..."
            className="mt-2 w-full rounded-xl bg-muted/60 border border-transparent focus:border-gold focus:bg-background focus:outline-none p-3 text-sm resize-y"
          />
        </div>

        {genError && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3 text-sm mb-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{genError}</span>
          </div>
        )}

        {genInfo && (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs mb-3 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-navy">
              <BookOpen className="w-3.5 h-3.5 text-gold" />
              المراجع القانونية المستعملة
            </div>
            <ul className="space-y-1 text-muted-foreground">
              {genInfo.sources.map((src) => (
                <li key={src}>• {src}</li>
              ))}
            </ul>
            {genInfo.missingData.length > 0 && (
              <div className="text-amber-700">
                بيانات ناقصة تركها العقد كحقول فارغة: {genInfo.missingData.join("، ")}
              </div>
            )}
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="اضغط «توليد النص تلقائيًا» بعد تعبئة الأطراف والعقار، أو اكتب النص يدويًا."
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
