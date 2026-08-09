import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type GatewayOptions = {
  structuredOutputs?: boolean;
};

/**
 * موفر Lovable AI Gateway — يُستخدم داخل handlers فقط.
 */
export function createLovableAiGatewayProvider(apiKey: string, options: GatewayOptions = {}) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    ...(options.structuredOutputs !== undefined
      ? { supportsStructuredOutputs: options.structuredOutputs }
      : {}),
  });
}

/**
 * موفر OpenAI مباشر — مستقل تمامًا عن رصيد Lovable، يُستخدم داخل handlers فقط.
 * يتطلب OPENAI_API_KEY كمتغير بيئة سري.
 */
export function createOpenAIDirectProvider(apiKey: string, options: GatewayOptions = {}) {
  return createOpenAICompatible({
    name: "openai-direct",
    baseURL: "https://api.openai.com/v1",
    apiKey,
    ...(options.structuredOutputs !== undefined
      ? { supportsStructuredOutputs: options.structuredOutputs }
      : {}),
  });
}
