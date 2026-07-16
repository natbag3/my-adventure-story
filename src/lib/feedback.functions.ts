import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: z.string().trim().min(1).max(4000),
});

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug report",
  feature: "Feature request",
  general: "General feedback",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

    const userEmail =
      (context.claims as { email?: string } | undefined)?.email ?? "unknown";
    const timestamp = new Date().toISOString();
    const typeLabel = TYPE_LABEL[data.type] ?? "General feedback";
    const subject = `[Adventure Club Feedback] ${typeLabel} from ${userEmail}`;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <h2 style="margin:0 0 16px;font-size:20px;">✨ New feedback</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#666;width:120px;">Type</td><td style="padding:6px 0;">${escapeHtml(typeLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">From</td><td style="padding:6px 0;">${escapeHtml(userEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">User ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px;">${escapeHtml(context.userId)}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Submitted</td><td style="padding:6px 0;">${escapeHtml(timestamp)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
        <div style="white-space:pre-wrap;line-height:1.5;font-size:14px;">${escapeHtml(data.message)}</div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Adventure Club Feedback <onboarding@resend.dev>",
        to: ["nat.bag@hotmail.co.uk"],
        reply_to: userEmail !== "unknown" ? userEmail : undefined,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Failed to send feedback [${res.status}]: ${detail}`);
    }

    return { ok: true };
  });
