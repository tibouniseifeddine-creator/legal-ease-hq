import type { CountryPack, ContractKnowledge } from "./types";
import { DZ_PACK } from "./dz";

export type { CountryPack, ContractKnowledge };

/**
 * سجل حزم المعرفة القانونية المتوفرة في المنصة.
 * أي بلد غير موجود هنا يُعتبر "معرفة غير متوفرة" — ويُمنع توليد محتوى قانوني
 * خاص به من معرفة النموذج العامة.
 */
const PACKS: Record<string, CountryPack> = {
  DZ: DZ_PACK,
};

/** قائمة البلدان المعروضة للمستخدم، مع بيان توفر الحزمة القانونية. */
export const SUPPORTED_COUNTRIES: { code: string; name: string; available: boolean }[] = [
  { code: "DZ", name: "الجزائر", available: true },
  { code: "MA", name: "المغرب", available: false },
  { code: "TN", name: "تونس", available: false },
  { code: "SA", name: "السعودية", available: false },
  { code: "AE", name: "الإمارات", available: false },
];

export function getCountryPack(countryCode: string): CountryPack | null {
  return PACKS[countryCode] ?? null;
}

export function getContractKnowledge(
  countryCode: string,
  contractType: string,
): { country: CountryPack; contract: ContractKnowledge } | null {
  const country = getCountryPack(countryCode);
  if (!country) return null;
  const contract = country.contracts[contractType];
  if (!contract) return null;
  return { country, contract };
}

/** يحوّل الحزمة إلى نص سياق يُمرَّر للذكاء الاصطناعي كمصدر وحيد للمعرفة القانونية. */
export function buildKnowledgeContext(country: CountryPack, contract: ContractKnowledge): string {
  const list = (title: string, items: string[]) =>
    items.length ? `${title}:\n${items.map((i) => `- ${i}`).join("\n")}` : "";

  return [
    `البلد: ${country.name} (${country.code})`,
    `النظام القانوني: ${country.legalSystem}`,
    `العملة: ${country.currency}`,
    list("ملاحظات عامة", country.generalNotes),
    `نوع العقد: ${contract.label}`,
    list(
      "المصادر القانونية المسموح الاستناد إليها حصريًا",
      contract.sources.map((s) => `${s.reference} — ${s.scope}`),
    ),
    list("البنود الإلزامية", contract.mandatoryClauses),
    list("متطلبات الشكل الرسمي", contract.formalRequirements),
    list("الوثائق المطلوبة", contract.requiredDocuments),
    list("الإجراءات", contract.procedures),
    list("الرسوم والضرائب", contract.taxesAndFees),
    list("المصطلحات المعتمدة", contract.terminology),
    list("الهيكل المرجعي للعقد", contract.structure),
  ]
    .filter(Boolean)
    .join("\n\n");
}
