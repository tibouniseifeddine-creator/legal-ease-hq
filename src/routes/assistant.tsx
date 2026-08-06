import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { ArrowRight, Sparkles, Send, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireOrgSession } from "@/lib/require-org-session";
import { AppShell } from "@/components/AppShell";
import { chatWithAssistant } from "@/lib/assistant.functions";
import type { Tables } from "@/integrations/supabase/types";

type AssistantMessage = Tables<"assistant_messages">;

function messagesQueryOptions(organizationId: string, userId: string) {
  return {
    queryKey: ["assistant-messages", organizationId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AssistantMessage[];
    },
  };
}

async function buildAssistantContext(organizationId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [invoicesRes, contractsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("title, amount, due_date, status")
      .eq("organization_id", organizationId)
      .in("status", ["unpaid", "overdue"])
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("contracts")
      .select("title, contract_type, end_date")
      .eq("organization_id", organizationId)
      .not("end_date", "is", null)
      .gte("end_date", monthStart)
      .lte("end_date", monthEnd)
      .limit(20),
  ]);

  const invoices = invoicesRes.data ?? [];
  const contracts = contractsRes.data ?? [];

  const lines: string[] = [];
  lines.push(`الفواتير غير المحصّلة (${invoices.length}):`);
  if (invoices.length === 0) {
    lines.push("- لا يوجد فواتير غير محصّلة حاليًا.");
  } else {
    for (const inv of invoices) {
      lines.push(
        `- ${inv.title}: ${Number(inv.amount).toLocaleString("ar-DZ")} دج، الاستحقاق: ${inv.due_date ?? "غير محدد"}، الحالة: ${inv.status === "overdue" ? "متأخرة" : "غير مدفوعة"}`,
      );
    }
  }
  lines.push("");
  lines.push(`العقود التي ينتهي أجلها هذا الشهر (${contracts.length}):`);
  if (contracts.length === 0) {
    lines.push("- لا يوجد عقود مسجَّل لها تاريخ انتهاء ضمن هذا الشهر (قد يكون تاريخ الانتهاء غير مُعبَّأ بعد لبعض العقود القديمة).");
  } else {
    for (const c of contracts) {
      lines.push(`- ${c.title} (${c.contract_type})، تاريخ الانتهاء: ${c.end_date}`);
    }
  }

  return lines.join("\n");
}

export const Route = createFileRoute("/assistant")({
  beforeLoad: requireOrgSession,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      messagesQueryOptions(context.organization.id, context.user.id),
    );
  },
  head: () => ({
    meta: [{ title: "NexLaw AI — NexLaw" }],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user, organization } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const runChat = useServerFn(chatWithAssistant);
  const { data: messages } = useSuspenseQuery(messagesQueryOptions(organization.id, user.id));

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingText, setTypingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingText]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["assistant-messages", organization.id, user.id] });

  const revealText = (fullText: string): Promise<void> => {
    return new Promise((resolve) => {
      let i = 0;
      setTypingText("");
      const interval = setInterval(() => {
        i += 3;
        setTypingText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          resolve();
        }
      }, 12);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setInput("");

    const { error: insertUserError } = await supabase.from("assistant_messages").insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "user",
      content: text,
    });

    if (insertUserError) {
      setError(insertUserError.message);
      setSending(false);
      return;
    }

    await invalidate();

    try {
      const [context, history] = await Promise.all([
        buildAssistantContext(organization.id),
        Promise.resolve([...messages, { role: "user" as const, content: text }].map((m) => ({ role: m.role, content: m.content }))),
      ]);
      const reply = await runChat({ data: { messages: history, context } });

      await revealText(reply);
      setTypingText(null);

      await supabase.from("assistant_messages").insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "assistant",
        content: reply,
      });
      await invalidate();
    } catch (err) {
      setTypingText(null);
      setError(err instanceof Error ? err.message : "تعذّر الاتصال بالمساعد الذكي");
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    await supabase
      .from("assistant_messages")
      .delete()
      .eq("organization_id", organization.id)
      .eq("user_id", user.id);
    await invalidate();
  };

  return (
    <AppShell user={user} organization={organization} title="المساعد الذكي" subtitle="مساعد NexLaw للأسئلة القانونية">

      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex-1 space-y-3">
          {messages.length === 0 && !typingText && (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">اسأل NexLaw AI</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                استفسارات قانونية وعقارية عامة، صياغة رسائل، أو اسأل عن «فواتير غير محصّلة» و«عقود تنتهي هذا الشهر».
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="flex">
              <div
                className={
                  m.role === "user"
                    ? "ml-auto bg-gold text-gold-foreground rounded-2xl rounded-l-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed"
                    : "mr-auto bg-card border border-border rounded-2xl rounded-r-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {typingText !== null && (
            <div className="flex">
              <div className="mr-auto bg-card border border-border rounded-2xl rounded-r-sm px-4 py-2.5 max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap">
                {typingText}
                <span className="inline-block w-1.5 h-4 bg-gold align-middle animate-pulse mr-0.5" />
              </div>
            </div>
          )}

          {sending && typingText === null && (
            <div className="flex">
              <div className="mr-auto bg-card border border-border rounded-2xl rounded-r-sm px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-gold" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2 sticky bottom-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك هنا..."
            disabled={sending}
            className="flex-1 h-12 rounded-xl bg-card border border-border focus:border-gold focus:outline-none px-4 text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-12 w-12 shrink-0 inline-flex items-center justify-center bg-gold text-gold-foreground rounded-xl hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
