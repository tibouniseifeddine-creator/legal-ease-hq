import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SendInviteEmailInput = z.object({
  toEmail: z.string().email(),
  organizationName: z.string().min(1).max(200),
  inviteUrl: z.string().url(),
  roleLabel: z.string().min(1).max(50),
});

export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInviteEmailInput.parse(input))
  .handler(async ({ data }): Promise<{ sent: boolean }> => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("مفتاح إرسال البريد غير مُهيأ");

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0d1b3d;">دعوة للانضمام إلى ${data.organizationName} على NexLaw</h2>
        <p>تمت دعوتك للانضمام كـ <strong>${data.roleLabel}</strong>.</p>
        <p>
          <a href="${data.inviteUrl}" style="background:#c8a24a; color:#0d1b3d; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:bold; display:inline-block;">
            الانضمام الآن
          </a>
        </p>
        <p style="color:#666; font-size:13px;">أو انسخ هذا الرابط: ${data.inviteUrl}</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NexLaw <onboarding@resend.dev>",
        to: [data.toEmail],
        subject: `دعوة للانضمام إلى ${data.organizationName}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`تعذّر إرسال البريد: ${errorText}`);
    }

    return { sent: true };
  });
