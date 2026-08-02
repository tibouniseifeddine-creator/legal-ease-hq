# CLAUDE.md — دليل تطوير NexLaw

> ملف توجيهي للاستمرار في تطوير مشروع NexLaw خارج Lovable باستخدام Claude (أو أي محرر آخر). يشرح البنية، الملفات المهمة، القواعد التقنية، وكيفية إضافة ميزات جديدة.

---

## 1. نظرة عامة على المشروع

**NexLaw** منصة عمل ذكية (AI Workspace) للمحامين والموثقين والوسطاء العقاريين والشركات. تجمع في مكان واحد إدارة العملاء، العقود، العقارات، الوثائق، والمساعد الذكي.

- **اللغة:** واجهة عربية RTL.
- **الحالة الحالية:** MVP يحتوي على لوحة تحكم (Dashboard) مع بيانات تجريبية، وأداة مراجعة العقود بالذكاء الاصطناعي.
- **المستقبل:** إضافة إدارة العملاء، العقارات، الوثائق، المهام، المواعيد، الفواتير، التقارير، ونظام المستخدمين.

---

## 2. تقنيات المشروع (Stack)

| الطبقة | التقنية | الغرض |
|--------|---------|-------|
| Framework | TanStack Start v1 | تطبيق React كامل مع Routing + Server Functions |
| Build | Vite 7 | حزم التطبيق وتشغيله |
| Styling | Tailwind CSS v4 | التنسيقات، محرك باستخدام `@theme` |
| Fonts | Google Fonts (Cairo) | خط عربي حديث |
| Icons | lucide-react | أيقوات واجهة المستخدم |
| State | React state + TanStack Query | إدارة الحالة المحلية والبعيدة |
| Server | `createServerFn` من `@tanstack/react-start` | وظائف الخادم الداخلية |
| AI | Lovable AI Gateway (`ai` + `@ai-sdk/openai-compatible`) | استدعاء نماذج الذكاء الاصطناعي |
| Database | Lovable Cloud / Supabase (مفعل) | تخزين البيانات والمصادقة |
| Validation | Zod | التحقق من البيانات الواردة |

---

## 3. هيكل الملفات

```text
NexLaw/
├── src/
│   ├── assets/                 # الصور (hero-handshake.jpg, ai-robot.png, ...)
│   ├── components/             # مكونات UI المشتركة (shadcn/ui)
│   ├── hooks/                  # Hooks مخصصة
│   ├── integrations/           # تكاملات Supabase (مولدة تلقائيًا)
│   │   └── supabase/
│   │       ├── client.ts       # عميل Supabase للمتصفح — لا تعدّله
│   │       ├── client.server.ts# عميل Supabase للخادم (service role) — لا تعدّله
│   │       ├── auth-middleware.ts
│   │       ├── auth-attacher.ts
│   │       └── types.ts        # أنواع قاعدة البيانات
│   ├── lib/                    # منطق التطبيق المشترك
│   │   ├── utils.ts            # cn() ومساعدات Tailwind
│   │   ├── ai-gateway.server.ts# موفر Lovable AI Gateway
│   │   ├── contract-review.functions.ts  # دالة مراجعة العقود بالـ AI
│   │   ├── error-page.ts
│   │   └── error-capture.ts
│   ├── routes/                 # ملفات المسارات (TanStack file routing)
│   │   ├── __root.tsx          # التخطيط الجذري + <head> + <QueryClientProvider>
│   │   ├── index.tsx           # لوحة التحكم (Dashboard) — الصفحة الرئيسية
│   │   └── contract-review.tsx # صفحة مراجعة العقد بالذكاء الاصطناعي
│   ├── router.tsx              # إعدادات Router
│   ├── server.ts               # إعدادات الخادم (createStart)
│   ├── start.ts                # Middleware + error handling
│   ├── styles.css              # التنسيقات العامة + تعريف التوكنات (Navy/Gold)
│   └── routeTree.gen.ts        # مولد تلقائيًا — لا تعدّله
├── supabase/
│   ├── config.toml             # مولد تلقائيًا — لا تعدّله
│   └── migrations/             # تراكات قاعدة البيانات (إذا أضفتها)
├── .env                        # متغيرات البيئة (Supabase, AI Key)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── CLAUDE.md                   # هذا الملف
└── AGENTS.md                   # تنبيهات Lovable
```

---

## 4. ملفات لا يجب تعديلها

| الملف | السبب |
|-------|-------|
| `src/integrations/supabase/client.ts` | مولد تلقائيًا من Lovable Cloud |
| `src/integrations/supabase/client.server.ts` | مولد تلقائيًا، يحتوي على service role key |
| `src/integrations/supabase/auth-attacher.ts` | مولد تلقائيًا |
| `src/integrations/supabase/auth-middleware.ts` | مولد تلقائيًا |
| `src/integrations/supabase/types.ts` | مولد تلقائيًا من أنواع Supabase |
| `src/routeTree.gen.ts` | يُعاد توليده تلقائيًا عند تغيير `src/routes/` |
| `supabase/config.toml` | مولد تلقائيًا |
| `.env` | يُدار من Lovable Cloud |

---

## 5. نظام التصميم (Design System)

التنسيقات مركزة في `src/styles.css` باستخدام توكنات Tailwind v4:

- **الخط:** Cairo — متغير `var(--font-arabic)`.
- **الاتجاه:** RTL يُضبط على `html` عبر `direction: rtl`.
- **الألوان الأساسية:**
  - **Navy:** `var(--color-navy)` — `#0d1b3d` تقريبًا (الشريط الجانبي، العناوين)
  - **Gold:** `var(--color-gold)` — `#d4a63a` (الأزرار الأساسية، التأكيدات)
- **الألوان المساعدة:**
  - `emerald-600` — النجاح/المكتمل
  - `sky-600/700` — قيد المراجعة
  - `amber-600` — انتظار/تحذير
  - `red-500` — خطر/منتهي الصلاحية

### قواعد التنسيق
- لا تستخدم ألوان Hex مباشرة في المكونات (`bg-[#...]`). استخدم التوكنات أو ألوان Tailwind المسماة (`bg-navy`, `bg-gold`, `text-gold-foreground`).
- كل الصفحات تستخدم `dir="rtl"` أو تعتمد على CSS العام.
- `rounded-2xl` هو الشكل الافتراضي للبطاقات.
- `border-border` للحدود الخفيفة.

---

## 6. Routing — نظام المسارات

TanStack Start يستخدم **File-based Routing**. كل ملف `.tsx` في `src/routes/` يُنشئ مسارًا تلقائيًا.

| الملف | المسار | ملاحظة |
|-------|--------|--------|
| `src/routes/index.tsx` | `/` | لوحة التحكم |
| `src/routes/contract-review.tsx` | `/contract-review` | مراجعة العقود بالـ AI |
| `src/routes/__root.tsx` | layout الجذر | `<html>`, `<head>`, `<QueryClientProvider>` |
| `src/routes/_layout.tsx` | layout | لا يوجد حاليًا |
| `src/routes/clients/index.tsx` | `/clients` | مستقبلي |
| `src/routes/clients/$id.tsx` | `/clients/:id` | ديناميكي |

### قواعد إضافة مسار
1. أنشئ الملف في `src/routes/`.
2. اكتب `export const Route = createFileRoute('/path')({ ... })`.
3. لا تحتاج لتعديل `router.tsx` أو `routeTree.gen.ts`.
4. إذا كان المسار يحتوي على محتوى مهم، أضف `head()` به عنوان ووصف فريدين.

### مثال على مسار جديد
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "العملاء — NexLaw" },
      { name: "description", content: "إدارة عملاء NexLaw" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  return <div className="p-6">صفحة العملاء</div>;
}
```

---

## 7. Server Functions — وظائف الخادم

لأي عملية خلفية (AI، قاعدة البيانات، مصادقة)، نستخدم `createServerFn` من `@tanstack/react-start`.

- ملفات `*.functions.ts` يمكن استيرادها من المكونات.
- ملفات `*.server.ts` يُمنع استيرادها من المكونات (تُستخدم فقط داخل `*.functions.ts` أو routes API).
- **مهم:** كل `createServerFn` يجب أن يكون غلافًا رقيقًا. كل المساعدات والمنطق يُستورد أو يُكتب داخل `handler`.

### مثال: إضافة دالة خادم جديدة
```ts
// src/lib/clients.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CreateClientInput = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

export const createClient = createServerFn({ method: "POST" })
  .inputValidator((input) => CreateClientInput.parse(input))
  .handler(async ({ data }) => {
    // هنا يمكن استخدام supabase أو أي منطق آخر
    return { id: "1", name: data.name };
  });
```

### استدعاء الدالة من المكون
```tsx
import { useServerFn } from "@tanstack/react-start";
import { createClient } from "@/lib/clients.functions";

function MyPage() {
  const create = useServerFn(createClient);

  const handleClick = async () => {
    const result = await create({ data: { name: "أحمد" } });
  };
}
```

---

## 8. الذكاء الاصطناعي (AI)

مراجعة العقود تعمل عبر `src/lib/contract-review.functions.ts` باستخدام `ai` + `createLovableAiGatewayProvider`.

### إضافة ميزة AI جديدة
1. أنشئ ملف `src/lib/<feature>.functions.ts`.
2. استورد `createLovableAiGatewayProvider` من `src/lib/ai-gateway.server.ts`.
3. اكتب `system prompt` واضحًا بالعربية.
4. استخدم `generateText` مع `output: Output.object({ schema: z.object(...) })` للحصول على نتائج منظمة.
5. تعامل مع `NoObjectGeneratedError` كـ fallback.

### ملاحظة خارج Lovable
إذا نقلت المشروع خارج Lovable، استبدل `baseURL` و`model` في `src/lib/ai-gateway.server.ts` بمفتاح ومزود خاص بك (مثل Anthropic أو OpenAI).

---

## 9. Supabase وقاعدة البيانات

المشروع مرتبط بـ Lovable Cloud (Supabase).

- في المتصفح: استخدم `import { supabase } from "@/integrations/supabase/client"`.
- في الخادم: استخدم `context.supabase` داخل `createServerFn` بعد إضافة `requireSupabaseAuth`، أو استخدم `supabaseAdmin` داخل `*.server.ts` للعمليات المسموح بها فقط.
- **لا تُظهر مفاتيح Supabase** في الواجهة أو logs.
- عند إنشاء أي جدول جديد في `public`، يجب أن يتضمن Migration:
  1. `CREATE TABLE public.<table>`
  2. `GRANT` للأدوار المناسبة
  3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  4. `CREATE POLICY` للوصول

### أدوار المستخدمين (إذا احتجتها)
يجب تخزين الأدوار في جدول منفصل `public.user_roles` وليس في `profiles`.

---

## 10. كيفية إضافة ميزة جديدة

### خطوات عامة
1. **حدد المسار:** أنشئ `src/routes/<feature>.tsx` أو `src/routes/<feature>/index.tsx`.
2. **أضف الروابط:** عدّل `navItems` في `src/routes/index.tsx` (الشريط الجانبي) و`quickActions` إن لزم.
3. **أضف الأيقونة:** من `lucide-react`.
4. **أضف منطق الخادم (إن لزم):** أنشئ `src/lib/<feature>.functions.ts`.
5. **حافظ على التصميم:** استخدم `bg-card`, `rounded-2xl`, `border-border`, `text-navy`, `bg-gold`.
6. **أضف head metadata:** عنوان ووصف فريدان للمسار.
7. **جرب التغيير:** شغّل `bun dev` أو `npm run dev`.

### مثال: إضافة صفحة "العملاء"
1. أنشئ `src/routes/clients/index.tsx`.
2. أضف `{ icon: Users, label: "العملاء", to: "/clients" }` في `navItems` في `src/routes/index.tsx`.
3. حوّل `button` الحالي إلى `Link` من `@tanstack/react-router` للتنقل.
4. قم بإنشاء جدول `public.clients` في Supabase + RLS + GRANTs.
5. أنشئ `src/lib/clients.functions.ts` للـ CRUD.
6. اعرض البيانات في جدول مشابه للموجود في Dashboard.

---

## 11. أوامر التطوير

```bash
# تشغيل التطوير المحلي
bun dev
# أو: npm run dev

# بناء إصدار الإنتاج
bun run build
# أو: npm run build

# معاينة الإصدار المبني
bun run preview

# تنسيق الكود
bun run format
# أو: npm run format

# فحص ESLint
bun run lint
```

---

## 12. أفضل الممارسات والقيود

- **لا تستخدم `useEffect` للتحميل الأولي.** استخدم route loader + `useSuspenseQuery`.
- **لا تستخدم `react-router-dom`.** المشروع يستخدم TanStack Router فقط.
- **لا تنشئ `src/pages/` أو `src/routes/_app/index.tsx`.** استخدم `src/routes/index.tsx`.
- **لا تستورد `*.server.ts` من المكونات.** سيسبب خطأ في البناء.
- **لا تضع مفاتيح API في الكود.** اقرأها داخل `handler` عبر `process.env`.
- **حافظ على RTL.** اختبر أي تخطيط أفقي جديد في الوضع RTL.
- **اختصر النصوص العربية.** الواجهة عربية، لذا يجب أن تكون الأزرار والعناوين واضحة وقصيرة.

---

## 13. أفكار الميزات القادمة (Roadmap)

- [x] لوحة تحكم Dashboard
- [x] مراجعة العقود بالذكاء الاصطناعي
- [ ] إدارة العملاء (CRUD + تفاصيل)
- [ ] إدارة العقارات (CRUD + صور)
- [ ] إنشاء العقود من قوالب جاهزة
- [ ] إدارة الوثائق (رفع + تنظيم + PDF)
- [ ] المهام والمواعيد
- [ ] الفواتير والمدفوعات
- [ ] التقارير والإحصائيات
- [ ] دردشة AI عامة (NexLaw AI Assistant)
- [ ] نظام المستخدمين والأدوار

---

## 14. ملاحظات التصدير

عند نقل المشروع إلى Claude أو بيئة تطوير محلية:

1. حدّث متغيرات البيئة في `.env` بمفاتيح Supabase الخاصة بك.
2. إذا كنت خارج Lovable، استبدل `LOVABLE_API_KEY` بمفتاح AI Gateway من اختيارك.
3. شغّل `bun install` أو `npm install`.
4. شغّل `bun dev`.
5. لأي تغييرات في Supabase، طبّق migrations باستخدام `supabase migration up` أو عبر لوحة Supabase.

---

> **تم إنشاء هذا الملف في 2026-08-02.** أعدلّه كلما تغيّرت البنية أو قواعد التطوير.
