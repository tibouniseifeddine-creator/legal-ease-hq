import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ReviewInput = z.object({
  contractText: z.string().min(20, "النص قصير جدًا").max(20000),
  contractType: z.string().max(80).nullable(),
});

const ReviewSchema = z.object({
  summary: z.string(),
  overallRisk: z.enum(["low", "medium", "high"]),
  clauses: z.array(
    z.object({
      title: z.string(),
      status: z.enum(["ok", "weak", "missing", "risky"]),
      note: z.string(),
    }),
  ),
  missingClauses: z.array(z.string()),
  risks: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      description: z.string(),
    }),
  ),
  suggestions: z.array(z.string()),
});

export type ContractReview = z.infer<typeof ReviewSchema>;

const SYSTEM_PROMPT = `أنت مساعد قانوني خبير في مراجعة العقود العقارية والقانونية باللغة العربية (الجزائر، السعودية، الإمارات).
مهمتك: تحليل نص العقد وإرجاع مراجعة منظمة تشمل:
- ملخص موجز للعقد.
- تقييم المخاطر الإجمالي (low/medium/high).
- تحليل البنود الرئيسية مع الحالة (ok=سليم، weak=ضعيف الصياغة، missing=مفقود، risky=خطير).
- قائمة البنود الناقصة الأساسية.
- المخاطر القانونية مع درجة الخطورة.
- اقتراحات عملية للتحسين.
كل النصوص باللغة العربية الفصحى الواضحة، مختصرة ومهنية.`;

export const reviewContract = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReviewInput.parse(input))
  .handler(async ({ data }): Promise<ContractReview> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("مفتاح الذكاء الاصطناعي غير مُهيأ");

    const gateway = createLovableAiGatewayProvider(key, { structuredOutputs: true });
    const model = gateway("openai/gpt-5.5");

    const userPrompt = [
      data.contractType ? `نوع العقد: ${data.contractType}` : null,
      "نص العقد المراد مراجعته:",
      "---",
      data.contractText,
      "---",
      "قم بمراجعة كاملة وأرجع النتيجة وفق البنية المطلوبة.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: ReviewSchema }),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return {
          summary: "تعذر تحليل العقد بالكامل، يرجى المحاولة مرة أخرى.",
          overallRisk: "medium",
          clauses: [],
          missingClauses: [],
          risks: [],
          suggestions: [],
        };
      }
      throw error;
    }
  });
