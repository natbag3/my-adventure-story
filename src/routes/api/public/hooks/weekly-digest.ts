import { createFileRoute } from "@tanstack/react-router";
import { WORLD_ZONES } from "@/lib/worlds";

type ChildRow = {
  id: string;
  user_id: string;
  first_name: string;
  streak_count: number | null;
};

type StoryRow = {
  id: string;
  child_id: string;
  title: string;
  theme: string | null;
  is_favorite: boolean | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

const APP_URL = "https://project--7650450c-a145-4f83-80ba-0fd7144a0e8e.lovable.app";

export const Route = createFileRoute("/api/public/hooks/weekly-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.WEEKLY_DIGEST_CRON_SECRET;
        const resendKey = process.env.RESEND_API_KEY;

        // Simple bearer-secret auth so the endpoint isn't openly triggerable.
        const auth = request.headers.get("authorization") ?? "";
        const provided = auth.replace(/^Bearer\s+/i, "").trim();
        if (!cronSecret || provided !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!resendKey) {
          return new Response("RESEND_API_KEY not configured", { status: 500 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const sinceIso = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        // 1. All stories from the past week (grouped later by user)
        const { data: stories, error: storiesErr } = await supabaseAdmin
          .from("stories")
          .select("id, child_id, user_id, title, theme, is_favorite, created_at")
          .gte("created_at", sinceIso);
        if (storiesErr) {
          return Response.json(
            { error: "stories_fetch_failed", detail: storiesErr.message },
            { status: 500 },
          );
        }

        // Group stories by user
        const storiesByUser = new Map<string, (StoryRow & { user_id: string })[]>();
        for (const s of (stories ?? []) as Array<StoryRow & { user_id: string }>) {
          const arr = storiesByUser.get(s.user_id) ?? [];
          arr.push(s);
          storiesByUser.set(s.user_id, arr);
        }

        const userIds = Array.from(storiesByUser.keys());
        if (userIds.length === 0) {
          return Response.json({ sent: 0, skipped: 0, users: 0 });
        }

        // 2. Load children and profiles for the relevant users
        const [{ data: children }, { data: profiles }] = await Promise.all([
          supabaseAdmin
            .from("children")
            .select("id, user_id, first_name, streak_count")
            .in("user_id", userIds),
          supabaseAdmin
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds),
        ]);

        const childrenByUser = new Map<string, ChildRow[]>();
        for (const c of (children ?? []) as ChildRow[]) {
          const arr = childrenByUser.get(c.user_id) ?? [];
          arr.push(c);
          childrenByUser.set(c.user_id, arr);
        }
        const profileById = new Map<string, ProfileRow>();
        for (const p of (profiles ?? []) as ProfileRow[]) profileById.set(p.id, p);

        // 3. Fetch each user's email from auth
        let sent = 0;
        let skipped = 0;
        const errors: Array<{ userId: string; error: string }> = [];

        for (const userId of userIds) {
          const userStories = storiesByUser.get(userId) ?? [];
          if (userStories.length === 0) {
            skipped++;
            continue;
          }
          const kids = childrenByUser.get(userId) ?? [];
          if (kids.length === 0) {
            skipped++;
            continue;
          }

          // Pick a "featured" child: the one with the most new stories this week
          const countsByChild = new Map<string, number>();
          for (const s of userStories) {
            countsByChild.set(s.child_id, (countsByChild.get(s.child_id) ?? 0) + 1);
          }
          const [featuredChildId] = [...countsByChild.entries()].sort(
            (a, b) => b[1] - a[1],
          )[0];
          const featured = kids.find((k) => k.id === featuredChildId) ?? kids[0];

          // Longest streak across the parent's children
          const longestStreak = kids.reduce(
            (m, k) => Math.max(m, k.streak_count ?? 0),
            0,
          );

          // Most-used theme (by adventure label stored in stories.theme)
          const themeCounts = new Map<string, number>();
          for (const s of userStories) {
            if (s.theme) themeCounts.set(s.theme, (themeCounts.get(s.theme) ?? 0) + 1);
          }
          const topTheme =
            [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          // Favourites this week (up to 3)
          const favourites = userStories
            .filter((s) => s.is_favorite)
            .slice(0, 3)
            .map((s) => s.title);

          // Fetch email from auth
          const { data: userRes, error: authErr } =
            await supabaseAdmin.auth.admin.getUserById(userId);
          if (authErr || !userRes?.user?.email) {
            errors.push({
              userId,
              error: authErr?.message ?? "no_email_on_user",
            });
            skipped++;
            continue;
          }
          const email = userRes.user.email;
          const parentName =
            profileById.get(userId)?.display_name ??
            userRes.user.user_metadata?.display_name ??
            null;

          const html = renderDigest({
            parentName,
            childName: featured.first_name,
            storyCount: userStories.length,
            streak: longestStreak,
            topTheme,
            favourites,
            appUrl: APP_URL,
          });

          const subject = `\u2728 ${featured.first_name}'s adventures this week`;

          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "Adventure Club <onboarding@resend.dev>",
              to: [email],
              subject,
              html,
            }),
          });

          if (!resendRes.ok) {
            const detail = await resendRes.text();
            errors.push({ userId, error: `resend_${resendRes.status}: ${detail}` });
            skipped++;
            continue;
          }
          sent++;
        }

        return Response.json({
          sent,
          skipped,
          users: userIds.length,
          errors: errors.length ? errors : undefined,
        });
      },
    },
  },
});

function renderDigest(input: {
  parentName: string | null;
  childName: string;
  storyCount: number;
  streak: number;
  topTheme: string | null;
  favourites: string[];
  appUrl: string;
}) {
  const { parentName, childName, storyCount, streak, topTheme, favourites, appUrl } =
    input;
  const zoneEmoji =
    WORLD_ZONES.find((z) =>
      z.themeKeywords.some((k) =>
        (topTheme ?? "").toLowerCase().includes(k),
      ),
    )?.emoji ?? "\u2728";

  const greeting = parentName ? `Hi ${escapeHtml(parentName)},` : "Hi there,";
  const favBlock =
    favourites.length > 0
      ? `<p style="margin:16px 0 0;color:#4a3f6d;font-size:15px;">You starred these this week: <strong>${favourites
          .map((f) => escapeHtml(f))
          .join(", ")}</strong>.</p>`
      : "";

  const themeLine = topTheme
    ? `<tr><td style="padding:8px 0;color:#6b5f8c;font-size:14px;">Favourite world</td><td style="padding:8px 0;color:#2a1f4a;font-size:14px;text-align:right;"><strong>${zoneEmoji} ${escapeHtml(
        topTheme,
      )}</strong></td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,110,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#3b2a70 0%,#6b4ba3 100%);padding:28px 32px;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.75;">Adventure Club</p>
                <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;">${escapeHtml(childName)}'s week in stories</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#2a1f4a;">
                <p style="margin:0 0 12px;font-size:16px;">${greeting}</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.55;">
                  This week ${escapeHtml(childName)} went on <strong>${storyCount}</strong>
                  ${storyCount === 1 ? "new adventure" : "new adventures"} with you.
                  ${streak > 1 ? `They kept a <strong>${streak}-night reading streak</strong> going \uD83D\uDD25` : ""}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece5ff;border-bottom:1px solid #ece5ff;margin:8px 0 20px;">
                  <tr><td style="padding:8px 0;color:#6b5f8c;font-size:14px;">Stories this week</td><td style="padding:8px 0;color:#2a1f4a;font-size:14px;text-align:right;"><strong>${storyCount}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#6b5f8c;font-size:14px;">Longest streak</td><td style="padding:8px 0;color:#2a1f4a;font-size:14px;text-align:right;"><strong>${streak} night${streak === 1 ? "" : "s"} \uD83D\uDD25</strong></td></tr>
                  ${themeLine}
                </table>
                ${favBlock}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
                  <tr>
                    <td style="border-radius:999px;background:#3b2a70;">
                      <a href="${appUrl}/create" style="display:inline-block;padding:14px 26px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:999px;">Read tonight's story \u2192</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;color:#8a7ea8;line-height:1.5;">
                  Sweet dreams from the Adventure Club team \uD83C\uDF19
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#8a7ea8;">You're receiving this because you have an Adventure Club account.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
