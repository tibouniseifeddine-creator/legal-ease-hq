import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getContractKnowledge, buildKnowledgeContext } from "./legal-knowledge";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  country: z.string().min(2).max(4),
  contractType: z.string().min(2).max(40),
  title: z.string().max(200).nullable(),
  contractDate: z.string().max(30),
  endDate: z.string().max(30).nullable(),
  partyA: z.object({ name: z.string().max(160), nationalId: z.string().max(60), phone: z.string().max(40) }),
  partyB: z.object({ name: z.string().max(160), nationalId: z.string().max(60), phone: z.string().max(40) }),
  property: z.object({
    title: z.string().max(200),
    type: z.string().max(40),
    city: z.string().max(120),
    address: z.string().max(300),
    area: z.number().nullable(),
    price: z.number().nullable(),
  }),
  witnesses: z.array(z.object({ name: z.string().max(160), nationalId: z.string().max(60) })).max(4),
  extraNotes: z.string().max(4000).nullable(),
});

export type GeneratedContract =
  | { available: false; message: string }
  | { available: true; content: string; sources: string[]; mandatoryClauses: string[]; missingData: string[] };

export const generateContractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<GeneratedContract> => {
    const knowledge = getContractKnowledge(data.country, data.contractType);
    if (!knowledge) {
      return {
        available: false,
        message:
          "المعرفة القانونية لهذا البلد/نوع العقد غير متوفرة حاليًا في حزم NexLaw القانونية. لا يمكن توليد عقد قانوني دون مصدر موثوق. اختر بلدًا أو نوع عقد مدعومًا، أو حرّر النص يدويًا.",
      };
    }

    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("مفتاح الذكاء الاصطناعي غير مُهيأ");

    const { country, contract } = knowledge;
    const context = buildKnowledgeContext(country, contract);

    const missingData: string[] = [];
    if (!data.partyA.name.trim()) missingData.push("اسم الطرف الأول");
    if (!data.partyB.name.trim()) missingData.push("اسم الطرف الثاني");
    if (!data.property.title.trim()) missingData.push("تعيين محل العقد");
    if (data.property.price === null) missingData.push("المبلغ / الثمن");
    if (!data.property.address.trim() && !data.property.city.trim()) missingData.push("عنوان محل العقد");

    const userData = [
      `تاريخ العقد: ${data.contractDate}`,
      data.endDate ? `تاريخ الانتهاء: ${data.endDate}` : "",
      data.title ? `عنوان مقترح: ${data.title}` : "",
      `الطرف الأول: ${data.partyA.name || "[غير محدد]"} | رقم الهوية: ${data.partyA.nationalId || "[غير محدد]"} | الهاتف: ${data.partyA.phone || "[غير محدد]"}`,
      `الطرف الثاني: ${data.partyB.name || "[غير محدد]"} | رقم الهوية: ${data.partyB.nationalId || "[غير محدد]"} | الهاتف: ${data.partyB.phone || "[غير محدد]"}`,
      `محل العقد: ${data.property.title || "[غير محدد]"} | النوع: ${data.property.type} | المدينة: ${data.property.city || "[غير محدد]"} | العنوان: ${data.property.address || "[غير محدد]"}`,
      `المساحة: ${data.property.area ?? "[غير محددة]"} | المبلغ: ${data.property.price ?? "[غير محدد]"} ${country.currency}`,
      data.witnesses.length
        ? `الشهود: ${data.witnesses.map((w) => `${w.name || "[غير محدد]"}${w.nationalId ? ` (${w.nationalId})` : ""}`).join(" ، ")}`
        : "",
      data.extraNotes ? `تفاصيل إضافية من المستخدم: ${data.extraNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `أنت محرر عقود قانوني محترف في منصة NexLaw.
قواعد صارمة:
1. لا تستشهد بأي قانون أو مادة أو إجراء غير موجود حرفيًا في "المعرفة القانونية" المزوّدة أدناه. ممنوع منعًا باتًا اختراع نصوص قانونية.
2. اتبع الهيكل المرجعي وأدرج كل البنود الإلزامية المذكورة.
3. حرر عقدًا كاملًا قابلًا للاستعمال، بصيغة عربية قانونية رسمية، مواد مرقّمة (المادة الأولى، المادة الثانية...).
4. أي معلومة ناقصة اتركها كحقل بين قوسين مربعين مثل [رقم الدفتر العقاري] بدل تخمينها.
5. أنهِ العقد بخانات التوقيع، وبقائمة الملحقات والوثائق المطلوبة.
6. أضف في آخر النص قسمًا بعنوان "المراجع القانونية" يسرد فقط المصادر المزوّدة.
7. أخرج نص العقد فقط دون أي شرح أو تعليق خارجي.

=== المعرفة القانونية المعتمدة (المصدر الوحيد) ===
${context}`;

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("openai/gpt-5.5");

    const { text } = await generateText({
      model,
      system,
      prompt: `حرر العقد الكامل بناءً على البيانات التالية:\n${userData}`,
    });

    return {
      available: true,
      content: text.trim(),
      sources: contract.sources.map((s) => s.reference),
      mandatoryClauses: contract.mandatoryClauses,
      missingData,
    };
  });
