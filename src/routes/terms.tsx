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
          هذه مسودة أولية لشروط الاستخدام، تحتاج مراجعة محامٍ مختص قبل اعتمادها رسميًا، وتحديد الجهة
          القانونية والاختصاص القضائي المناسبَين لعملك.
        </div>

        <Section title="١. طبيعة الخدمة">
          <p>
            NexLaw أداة إدارية لتنظيم أعمال المكاتب القانونية والعقارية (عملاء، عقارات، عقود، وثائق،
            فواتير). المنصة أداة مساعدة فقط، ولا تُعدّ استشارة قانونية، ولا تحلّ محل مراجعة المحامي أو
            الموثق المختص لأي مستند أو معاملة.
          </p>
        </Section>

        <Section title="٢. مسؤولية المحتوى الذي تُنشئه">
          <p>
            أنت المسؤول الوحيد عن دقة البيانات التي تُدخلها، وعن مراجعة أي عقد أو مستند تُولّده المنصة
            (بما في ذلك عبر ميزة "توليد النص تلقائيًا" أو المساعد الذكي) قبل استخدامه فعليًا أو توقيعه.
            هذه الأدوات تُنتج مسودة أولية فقط، لا نصًا نهائيًا معتمَدًا.
          </p>
        </Section>

        <Section title="٣. حسابك ومكتبك">
          <p>
            أنت مسؤول عن سرية بيانات دخولك. أي عضو تدعوه لمكتبك عبر رابط الدعوة يصبح له حق الوصول
            لبيانات المكتب حسب الدور الممنوح له (عضو أو مدير).
          </p>
        </Section>

        <Section title="٤. حدود المسؤولية">
          <p>
            تُقدَّم المنصة "كما هي"، دون ضمان خلوّها التام من الأعطال. لا نتحمل مسؤولية أي ضرر ناتج عن
            الاعتماد الكامل على محتوى مُولَّد آليًا دون مراجعته من طرف مختص.
          </p>
        </Section>

        <Section title="٥. التعديلات">
          <p>قد تُحدَّث هذه الشروط دوريًا. الاستمرار في استخدام المنصة بعد أي تحديث يُعدّ موافقة على الشروط الجديدة.</p>
        </Section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          آخر تحديث لهذه المسودة: يُحدَّد عند الاعتماد الرسمي.
        </p>
      </main>
    </div>
  );
}
