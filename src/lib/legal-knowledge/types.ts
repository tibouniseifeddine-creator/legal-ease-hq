/**
 * أنواع حزم المعرفة القانونية (Legal Knowledge Packs).
 * الحزم بيانات ثابتة داخل المنصة ومستقلة تمامًا عن نموذج الذكاء الاصطناعي.
 */

export type LegalSource = {
  /** اسم النص القانوني كما هو رسميًا */
  reference: string;
  /** ما الذي ينظّمه هذا النص */
  scope: string;
};

export type ContractKnowledge = {
  /** تسمية نوع العقد بالعربية */
  label: string;
  /** المصادر القانونية المطبقة */
  sources: LegalSource[];
  /** البنود الإلزامية التي يجب أن يتضمنها العقد */
  mandatoryClauses: string[];
  /** المعلومات المطلوبة قبل التحرير */
  requiredData: string[];
  /** الوثائق المطلوبة */
  requiredDocuments: string[];
  /** الإجراءات العملية بعد التحرير */
  procedures: string[];
  /** الرسوم والضرائب */
  taxesAndFees: string[];
  /** المصطلحات القانونية المعتمدة */
  terminology: string[];
  /** الهيكل المرجعي للعقد (ترتيب الأقسام) */
  structure: string[];
  /** متطلبات التوثيق/الشكل الرسمي */
  formalRequirements: string[];
};

export type CountryPack = {
  code: string;
  name: string;
  /** النظام القانوني العام */
  legalSystem: string;
  /** العملة المستعملة في العقود */
  currency: string;
  /** ملاحظات عامة تسري على كل العقود في هذا البلد */
  generalNotes: string[];
  contracts: Record<string, ContractKnowledge>;
};
