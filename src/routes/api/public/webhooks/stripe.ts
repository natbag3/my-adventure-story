import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { isValidTier, type Tier } from "@/lib/subscription";

// Stripe signs webhooks as t=<ts>,v1=<sig>. We recompute HMAC-SHA256 over `${t}.${payload}`
// with the endpoint secret and compare in constant time.
function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const map = new Map(parts.map(([k, v]) => [k, v]));
  const t = map.get("t");
  const v1 = map.get("v1");
  if (!t || !v1) return false;
  const signed = `${t}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type SubscriptionObject = {
  id: string;
  status: string;
  customer: string;
  metadata?: { user_id?: string; tier?: string };
  items?: {
    data?: Array<{ price?: { id?: string; metadata?: { tier?: string } } }>;
  };
};

type CheckoutSessionObject = {
  id: string;
  customer: string | null;
  subscription: string | null;
  metadata?: { user_id?: string; tier?: string };
  mode?: string;
};

async function tierFromSubscription(sub: SubscriptionObject): Promise<Tier | null> {
  // 1. Direct metadata on the subscription
  const metaTier = sub.metadata?.tier;
  if (isValidTier(metaTier)) return metaTier;
  // 2. Match line-item price against our env price IDs
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const map: Record<string, Tier> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? ""]: "starter",
    [process.env.STRIPE_PRICE_STARTER_YEARLY ?? ""]: "starter",
    [process.env.STRIPE_PRICE_EXPLORER_MONTHLY ?? ""]: "explorer",
    [process.env.STRIPE_PRICE_EXPLORER_YEARLY ?? ""]: "explorer",
    [process.env.STRIPE_PRICE_UNLIMITED_MONTHLY ?? ""]: "unlimited",
    [process.env.STRIPE_PRICE_UNLIMITED_YEARLY ?? ""]: "unlimited",
  };
  return map[priceId] ?? null;
}

async function stripeFetch<T>(path: string): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY!;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error(`Stripe fetch ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }
        const rawBody = await request.text();
        const sig = request.headers.get("stripe-signature");
        if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(rawBody) as {
          type: string;
          data: { object: unknown };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as CheckoutSessionObject;
              const userId = session.metadata?.user_id;
              if (!userId || session.mode !== "subscription" || !session.subscription) break;
              const sub = await stripeFetch<SubscriptionObject>(
                `/subscriptions/${session.subscription}`,
              );
              const tier = (await tierFromSubscription(sub)) ?? "starter";
              await supabaseAdmin
                .from("profiles")
                .update({
                  subscription_tier: tier,
                  subscription_status: "active",
                  stripe_customer_id: session.customer ?? sub.customer,
                  stripe_subscription_id: session.subscription,
                  is_premium: true,
                } as never)
                .eq("id", userId);
              break;
            }
            case "customer.subscription.updated": {
              const sub = event.data.object as SubscriptionObject;
              const userId = sub.metadata?.user_id;
              const tier = await tierFromSubscription(sub);
              const updates: Record<string, unknown> = {
                subscription_status: sub.status,
                stripe_subscription_id: sub.id,
                stripe_customer_id: sub.customer,
              };
              if (tier) {
                updates.subscription_tier = tier;
                updates.is_premium = tier === "explorer" || tier === "unlimited";
              }
              if (userId) {
                await supabaseAdmin.from("profiles").update(updates as never).eq("id", userId);
              } else {
                await supabaseAdmin
                  .from("profiles")
                  .update(updates as never)
                  .eq("stripe_customer_id", sub.customer);
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as SubscriptionObject;
              const userId = sub.metadata?.user_id;
              const updates = {
                subscription_tier: "free",
                subscription_status: "canceled",
                stripe_subscription_id: null,
                is_premium: false,
              };
              if (userId) {
                await supabaseAdmin.from("profiles").update(updates as never).eq("id", userId);
              } else {
                await supabaseAdmin
                  .from("profiles")
                  .update(updates as never)
                  .eq("stripe_customer_id", sub.customer);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook]", event.type, err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
