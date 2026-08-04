import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * موفر Lovable AI Gateway — يُستخدم داخل handlers فقط.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
  });
}
