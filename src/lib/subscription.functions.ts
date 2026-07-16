import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { TIERS, isValidTier, type Tier, type Interval } from "@/lib/subscription";

type ProfileRow = {
  id: string;
  email?: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stories_generated_this_month: number | null;
  stories_generated_total: number | null;
  stories_month_reset_date: string | null;
};

// Roll the monthly reset window forward if it has passed. Returns the (possibly refreshed) row.
async function ensureUsageWindow(profile: ProfileRow, userId: string): Promise<ProfileRow> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const resetDate = profile.stories_month_reset_date
    ? new Date(profile.stories_month_reset_date + "T00:00:00Z")
    : null;
  if (!resetDate || resetDate.getTime() > today.getTime()) return profile;

  // Roll forward 1 month from today.
  const next = new Date(today);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextIso = next.toISOString().slice(0, 10);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("profiles")
    .update({
      stories_generated_this_month: 0,
      stories_month_reset_date: nextIso,
    } as never)
    .eq("id", userId);

  return {
    ...profile,
    stories_generated_this_month: 0,
    stories_month_reset_date: nextIso,
  };
}

export type SubscriptionState = {
  tier: Tier;
  status: string | null;
  storiesThisMonth: number;
  storiesTotal: number;
  resetDate: string; // ISO date
  hasStripeCustomer: boolean;
  storyLimit: number | null;
  storyLimitType: "total" | "monthly";
  storiesUsed: number; // for progress bar; if free: total, else monthly
  atLimit: boolean;
};

export function computeStateFromProfile(p: ProfileRow): SubscriptionState {
  const tier: Tier = isValidTier(p.subscription_tier) ? p.subscription_tier : "free";
  const cfg = TIERS[tier];
  const monthly = p.stories_generated_this_month ?? 0;
  const total = p.stories_generated_total ?? 0;
  const storiesUsed = cfg.storyLimitType === "total" ? total : monthly;
  const atLimit = cfg.storyLimit === null ? false : storiesUsed >= cfg.storyLimit;
  return {
    tier,
    status: p.subscription_status,
    storiesThisMonth: monthly,
    storiesTotal: total,
    resetDate: p.stories_month_reset_date ?? new Date().toISOString().slice(0, 10),
    hasStripeCustomer: !!p.stripe_customer_id,
    storyLimit: cfg.storyLimit,
    storyLimitType: cfg.storyLimitType,
    storiesUsed,
    atLimit,
  };
}

/** Read the user's current subscription state (rolls the monthly window if needed). */
export const getSubscriptionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionState> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, stories_generated_this_month, stories_generated_total, stories_month_reset_date",
      )
      .eq("id", userId)
      .maybeSingle();
    if (!data) throw new Error("Profile not found");
    const refreshed = await ensureUsageWindow(data as ProfileRow, userId);
    return computeStateFromProfile(refreshed);
  });

/** Server-side gatekeeper used by story generation (and pre-checked client-side). */
export async function assertCanGenerateStory(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, stories_generated_this_month, stories_generated_total, stories_month_reset_date",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Profile not found");
  const refreshed = await ensureUsageWindow(data as ProfileRow, userId);
  const state = computeStateFromProfile(refreshed);
  if (state.atLimit) {
    throw new Error(
      state.storyLimitType === "total"
        ? "You've used your 3 free stories. Upgrade to keep the adventures going."
        : "You've used all your stories this month. Upgrade to keep going.",
    );
  }
}

/** Increment usage counters after a successful story generation. */
export async function incrementStoryUsage(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("stories_generated_this_month, stories_generated_total")
    .eq("id", userId)
    .maybeSingle();
  const monthly = ((data as { stories_generated_this_month?: number } | null)?.stories_generated_this_month ?? 0) + 1;
  const total = ((data as { stories_generated_total?: number } | null)?.stories_generated_total ?? 0) + 1;
  await supabaseAdmin
    .from("profiles")
    .update({ stories_generated_this_month: monthly, stories_generated_total: total } as never)
    .eq("id", userId);
}

// ============================================================
// Stripe Checkout & Portal (direct REST calls — no SDK needed)
// ============================================================

function stripePriceId(tier: Tier, interval: Interval): string {
  if (tier === "free") throw new Error("Free tier has no Stripe price");
  const cfg = TIERS[tier];
  const envKey = interval === "month" ? cfg.priceEnvMonthly : cfg.priceEnvYearly;
  const value = process.env[envKey];
  if (!value) throw new Error(`Missing env var ${envKey}. Set the Stripe price ID in project secrets.`);
  return value;
}

async function stripeRequest<T>(
  path: string,
  form: Record<string, string>,
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const body = new URLSearchParams(form).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } }).error?.message ?? `Stripe error ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

const CheckoutInput = z.object({
  tier: z.enum(["starter", "explorer", "unlimited"]),
  interval: z.enum(["month", "year"]),
  origin: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { supabase, userId, claims } = context;
    const priceId = stripePriceId(data.tier, data.interval);
    const email = (claims as { email?: string } | null)?.email;

    // Reuse an existing Stripe customer if we've already stored one.
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

    const form: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${data.origin}/settings?subscription=success`,
      cancel_url: `${data.origin}/settings`,
      "metadata[user_id]": userId,
      "metadata[tier]": data.tier,
      "subscription_data[metadata][user_id]": userId,
      "subscription_data[metadata][tier]": data.tier,
      allow_promotion_codes: "true",
    };
    if (customerId) {
      form.customer = customerId;
    } else if (email) {
      form.customer_email = email;
    }

    const session = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", form);
    return { url: session.url };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) throw new Error("No Stripe customer on file. Subscribe first.");
    const session = await stripeRequest<{ id: string; url: string }>("/billing_portal/sessions", {
      customer: customerId,
      return_url: `${data.origin}/settings`,
    });
    return { url: session.url };
  });
