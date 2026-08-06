import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  context: z.string().max(4000).optional(),
});

const BASE_SYSTEM_PROMPT = `أنت "NexLaw AI"، المساعد الذكي داخل منصة NexLaw لإدارة أعمال المحامين والموثقين والوسطاء العقاريين في الجزائر والسعودية والإمارات.
تساعد في: أسئلة قانونية وعقارية عامة، صياغة رسائل ومسودات، تنظيم المهام، وأي استفسار متعلق بعمل المكتب.
أجب دائمًا بالعربية الفصحى، بإيجاز ووضوح.
وضّح عند الأسئلة القانونية الدقيقة أنك لست بديلاً عن استشارة قانونية رسمية.
إذا زُوِّدت ببيانات فعلية عن مكتب المستخدم (فواتير، عقود...)، استخدمها مباشرة في إجابتك واعتبرها المصدر الوحيد الموثوق لهذه الأرقام — لا تخترع أرقامًا غير موجودة فيها، وإذا كانت القائمة فارغة أخبر المستخدم بوضوح أنه لا يوجد شيء مطابق حاليًا.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }): Promise<string> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("مفتاح الذكاء الاصطناعي غير مُهيأ");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("openai/gpt-5.5");

    const system = data.context
      ? `${BASE_SYSTEM_PROMPT}\n\nبيانات مكتب المستخدم الحالية (حقيقية، محدَّثة وقت السؤال):\n${data.context}`
      : BASE_SYSTEM_PROMPT;

    const { text } = await generateText({
      model,
      system,
      messages: data.messages,
    });

    return text;
  });
