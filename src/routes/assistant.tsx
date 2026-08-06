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
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["assistant-messages", organization.id, user.id] });

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
      const history = [...messages, { role: "user" as const, content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await runChat({ data: { messages: history } });

      await supabase.from("assistant_messages").insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "assistant",
        content: reply,
      });
      await invalidate();
    } catch (err) {
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
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-gold" />
              </div>
              <h2 className="mt-4 font-bold text-navy text-lg">اسأل NexLaw AI</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                استفسارات قانونية وعقارية عامة، صياغة رسائل، أو أي مساعدة في عملك اليومي.
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

          {sending && (
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
