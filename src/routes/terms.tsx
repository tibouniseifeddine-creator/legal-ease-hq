import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileCheck } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "شروط الاستخدام — NexLaw" }],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-navy text-lg">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-gold-foreground" />
            </div>
            <div className="font-bold text-navy">شروط الاستخدام</div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
            العودة للوحة التحكم
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm">
          <strong>هذه مسودة قيد الإعداد، غير معتمدة رسميًا بعد.</strong> تحتاج مراجعة محامٍ مختص قبل
          اعتمادها، وتحديد الجهة القانونية والاختصاص القضائي المناسبَين لعملك.
        </div>

        <Section title="١. طبيعة الخدمة">
          <p>
            NexLaw أداة إدارية لتنظيم أعمال المكاتب القانونية والعقارية (عملاء، عقارات، عقود، وثائق،
            فواتير). المنصة أداة مساعدة فقط، ولا تُعدّ استشارة قانونية، ولا تحلّ محل مراجعة المحامي أو
            الموثق المختص لأي مستند أو معاملة.
          </p>
        </Section>

        <Section title="٢. أهلية الاستخدام">
          <p>
            الخدمة موجَّهة للاستخدام المهني من قِبل مكاتب ومهنيين قانونيين وعقاريين بالغين. بإنشائك
            حسابًا، تُقرّ بأنك مخوَّل قانونيًا لتمثيل المكتب الذي تسجّله، وأن استخدامك للمنصة يتوافق مع
            القوانين والأنظمة المهنية السارية في بلدك (بما فيها أنظمة نقابة المحامين أو غرفة التوثيق
            إن وُجدت).
          </p>
        </Section>

        <Section title="٣. مسؤولية المحتوى الذي تُنشئه">
          <p>
            أنت المسؤول الوحيد عن دقة البيانات التي تُدخلها، وعن مراجعة أي عقد أو مستند تُولّده المنصة
            (بما في ذلك عبر ميزة "توليد النص تلقائيًا" أو المساعد الذكي) قبل استخدامه فعليًا أو توقيعه.
            هذه الأدوات تُنتج مسودة أولية فقط، لا نصًا نهائيًا معتمَدًا، ولا تُغني عن التزاماتك المهنية
            تجاه عملائك.
          </p>
        </Section>

        <Section title="٤. حسابك ومكتبك">
          <p>
            أنت مسؤول عن سرية بيانات دخولك وعن كل نشاط يجري عبر حسابك. أي عضو تدعوه لمكتبك عبر رابط
            الدعوة يصبح له حق الوصول لبيانات المكتب حسب الدور الممنوح له (عضو أو مدير)، وأنت مسؤول عن
            التحقق من هوية من تدعوه قبل منحه هذا الوصول.
          </p>
        </Section>

        <Section title="٥. الاستخدام المقبول">
          <p>
            يُمنع استخدام المنصة لأي غرض غير قانوني، أو لإدخال بيانات لا تملك حق معالجتها، أو لمحاولة
            الوصول لبيانات مكتب آخر غير مكتبك، أو لإساءة استخدام ميزة الدعوة أو المساعد الذكي بما يخالف
            الغرض المخصَّصة له.
          </p>
        </Section>

        <Section title="٦. حدود المسؤولية">
          <p>
            تُقدَّم المنصة "كما هي"، دون ضمان خلوّها التام من الأعطال. لا نتحمل مسؤولية أي ضرر ناتج عن
            الاعتماد الكامل على محتوى مُولَّد آليًا (عقود أو استشارات) دون مراجعته من طرف مختص، ولا عن
            أي قرار مهني أو قانوني اتخذته بناءً على مخرجات المنصة دون تلك المراجعة.
          </p>
        </Section>

        <Section title="٧. إنهاء الخدمة">
          <p>
            يمكنك إنهاء حسابك في أي وقت وطلب حذف بياناته. نحتفظ بحق تعليق أو إنهاء أي حساب يخالف هذه
            الشروط أو يُستخدَم بشكل يهدد أمان المنصة أو بيانات مستخدمين آخرين.
          </p>
        </Section>

        <Section title="٨. التعديلات">
          <p>قد تُحدَّث هذه الشروط دوريًا. الاستمرار في استخدام المنصة بعد أي تحديث يُعدّ موافقة على الشروط الجديدة.</p>
        </Section>

        <Section title="٩. القانون الواجب التطبيق">
          <p>
            يُحدَّد القانون الواجب التطبيق والاختصاص القضائي المختص عند الاعتماد الرسمي لهذه الشروط،
            بالتنسيق مع الجهة القانونية المسؤولة عن المنصة.
          </p>
        </Section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          حالة هذه الوثيقة: مسودة قيد المراجعة — لم تُعتمَد رسميًا بعد.
        </p>
      </main>
    </div>
  );
}
