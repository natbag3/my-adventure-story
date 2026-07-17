// Subscription tier definitions — source of truth for pricing, limits & features.
// All prices are in USD ($). Stripe handles conversion at checkout.

export type Tier = "free" | "starter" | "explorer" | "unlimited";
export type Interval = "month" | "year";

export type TierConfig = {
  id: Tier;
  name: string;
  emoji: string;
  tagline: string;
  storyLimit: number | null; // null = unlimited
  storyLimitLabel: string;
  storyLimitType: "total" | "monthly";
  narration: boolean;
  profiles: number | null; // null = unlimited
  profilesLabel: string;
  priceMonthly: number;
  priceYearly: number;
  priceEnvMonthly: string; // env-var name that holds the Stripe price ID
  priceEnvYearly: string;
  features: string[];
};

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    emoji: "✨",
    tagline: "Try Adventure Club",
    storyLimit: 3,
    storyLimitLabel: "3 stories total (trial)",
    storyLimitType: "total",
    narration: false,
    profiles: 1,
    profilesLabel: "1 child profile",
    priceMonthly: 0,
    priceYearly: 0,
    priceEnvMonthly: "",
    priceEnvYearly: "",
    features: [
      "3 stories total (trial)",
      "1 child profile",
      "Standard illustrations",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    emoji: "🌱",
    tagline: "A bedtime habit",
    storyLimit: 10,
    storyLimitLabel: "10 stories / month",
    storyLimitType: "monthly",
    narration: false,
    profiles: 2,
    profilesLabel: "2 child profiles",
    priceMonthly: 5.99,
    priceYearly: 57.99,
    priceEnvMonthly: "STRIPE_PRICE_STARTER_MONTHLY",
    priceEnvYearly: "STRIPE_PRICE_STARTER_YEARLY",
    features: [
      "10 stories per month",
      "2 child profiles",
      "HD illustrations",
    ],
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    emoji: "🚀",
    tagline: "Most popular",
    storyLimit: 20,
    storyLimitLabel: "20 stories / month",
    storyLimitType: "monthly",
    narration: true,
    profiles: 3,
    profilesLabel: "3 child profiles",
    priceMonthly: 12.99,
    priceYearly: 124.99,
    priceEnvMonthly: "STRIPE_PRICE_EXPLORER_MONTHLY",
    priceEnvYearly: "STRIPE_PRICE_EXPLORER_YEARLY",
    features: [
      "20 stories per month",
      "🎙️ Voice narration",
      "3 child profiles",
      "HD illustrations",
    ],
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    emoji: "🌌",
    tagline: "Every night, forever",
    storyLimit: null,
    storyLimitLabel: "Unlimited stories",
    storyLimitType: "monthly",
    narration: true,
    profiles: null,
    profilesLabel: "Unlimited profiles",
    priceMonthly: 19.99,
    priceYearly: 159.99,
    priceEnvMonthly: "STRIPE_PRICE_UNLIMITED_MONTHLY",
    priceEnvYearly: "STRIPE_PRICE_UNLIMITED_YEARLY",
    features: [
      "Unlimited stories",
      "🎙️ Voice narration",
      "Unlimited profiles",
      "HD illustrations",
      "Everything in Explorer",
    ],
  },
};

export const PAID_TIERS: readonly Tier[] = ["starter", "explorer", "unlimited"];

export function tierHasNarration(tier: Tier): boolean {
  return TIERS[tier].narration;
}

export function isValidTier(x: string | null | undefined): x is Tier {
  return x === "free" || x === "starter" || x === "explorer" || x === "unlimited";
}

export function formatUSD(n: number): string {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

/** Yearly savings vs 12 months of monthly, as a rounded USD number. */
export function yearlySavings(tier: Tier): number {
  const c = TIERS[tier];
  return Math.max(0, Math.round(c.priceMonthly * 12 - c.priceYearly));
}
