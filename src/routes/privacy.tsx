import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "سياسة الخصوصية — NexLaw" }],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-navy text-lg">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-gold-foreground" />
            </div>
            <div className="font-bold text-navy">سياسة الخصوصية</div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm">
          هذه مسودة أولية لسياسة الخصوصية، أُعدَّت لتعكس طبيعة عمل المنصة بشكل عام. يجب مراجعتها
          من محامٍ مختص قبل اعتمادها رسميًا، وتحديث بيانات التواصل والجهة القانونية المسؤولة.
        </div>

        <Section title="١. البيانات التي نجمعها">
          <p>
            بيانات حسابك (الاسم، البريد الإلكتروني)، وبيانات مكتبك (اسم المكتب)، والبيانات التي تُدخلها
            بنفسك لإدارة عملك: بيانات العملاء (الاسم، الهاتف، رقم الهوية، العنوان)، بيانات العقارات
            والعقود والفواتير، والمستندات التي ترفعها.
          </p>
        </Section>

        <Section title="٢. كيف نستخدم هذه البيانات">
          <p>
            نستخدم هذه البيانات حصرًا لتشغيل المنصة وتقديم الخدمة لك: عرض بياناتك، توليد المستندات
            التي تطلبها، وتنبيهك بالمواعيد والمستحقات. لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث
            لأغراض تسويقية.
          </p>
        </Section>

        <Section title="٣. أين تُخزَّن البيانات">
          <p>
            تُخزَّن بياناتك في قاعدة بيانات مُدارة عبر مزوّد الاستضافة الذي تعمل عليه المنصة، مع صلاحيات
            وصول مقيدة تضمن أن بيانات كل مكتب معزولة تمامًا عن بيانات المكاتب الأخرى.
          </p>
        </Section>

        <Section title="٤. مشاركة البيانات مع الذكاء الاصطناعي">
          <p>
            بعض ميزات المنصة (مراجعة العقود، المساعد الذكي) ترسل جزءًا من النص الذي تكتبه أو تطلبه
            إلى مزوّد خدمة ذكاء اصطناعي لمعالجته وإرجاع نتيجة. لا تُشارك بيانات عملائك الكاملة إلا
            بالقدر اللازم لتنفيذ الطلب الذي أدخلته أنت مباشرة.
          </p>
        </Section>

        <Section title="٥. حقوقك">
          <p>
            يحق لك الوصول إلى بياناتك أو تعديلها أو طلب حذفها في أي وقت. يمكنك حذف أي سجل (عميل،
            عقار، وثيقة...) مباشرة من داخل المنصة، أو التواصل معنا لطلب حذف كامل لحسابك وبياناته.
          </p>
        </Section>

        <Section title="٦. أمان البيانات">
          <p>
            نطبّق سياسات وصول صارمة على مستوى قاعدة البيانات تمنع أي مستخدم من الوصول لبيانات مكتب
            آخر، ونستخدم اتصالًا مشفّرًا (HTTPS) لكل تفاعل مع المنصة.
          </p>
        </Section>

        <Section title="٧. التواصل">
          <p>لأي استفسار متعلق بالخصوصية، يُرجى التواصل عبر البريد الإلكتروني الموضّح في صفحة الإعدادات.</p>
        </Section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          آخر تحديث لهذه المسودة: يُحدَّد عند الاعتماد الرسمي.
        </p>
      </main>
    </div>
  );
}
