import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SUBSCRIPTION } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — Adventure Club" },
      { name: "description", content: "Choose the plan that fits your bedtime ritual." },
      { property: "og:title", content: "Subscription Plans — Adventure Club" },
      { property: "og:description", content: "Free, Premium, and Family plans for unlimited bedtime adventures." },
    ],
  }),
  component: SubscriptionPage,
});

type Plan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  accent: string;
  featured?: boolean;
  features: readonly string[];
};

const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    accent: "from-mint/20 to-lavender/10",
    features: [
      "Up to 2 stories per month",
      "Stories up to 3 minutes",
      "Standard-quality illustrations",
      "Single child profile",
    ],
  },
  {
    id: "premium",
    name: "Adventure Club Premium",
    price: "$9.99",
    cadence: "per month",
    accent: "from-star/30 to-peach/15",
    featured: true,
    features: [
      "Unlimited stories",
      "Multiple child profiles",
      "Story narration",
      "HD illustrations",
      "Adventure Passport & Library",
      "Stories up to 10 minutes",
    ],
  },
  {
    id: "family",
    name: "Family Plan",
    price: "$19.99",
    cadence: "per month",
    accent: "from-lavender/30 to-peach/15",
    features: [
      "Up to 6 children",
      "Unlimited stories",
      "Family adventures",
      "Shared achievements",
      "Multiple devices",
      "Everything in Premium",
    ],
  },
];

function SubscriptionPage() {
  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Your plan</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Subscription</h1>
      </header>

      {/* Current plan */}
      <section className="mb-12 rounded-[32px] border border-hairline bg-gradient-to-br from-surface to-surface-elevated p-8 card-glow animate-slide-up [animation-delay:100ms]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">Current plan</p>
            <h2 className="mt-1 font-display text-3xl text-foreground">{SUBSCRIPTION.plan}</h2>
            <p className="mt-2 text-foreground/55 text-sm">
              {SUBSCRIPTION.price} · renews {new Date(SUBSCRIPTION.renewsOn).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">This month</p>
            <p className="font-display text-2xl text-foreground">
              {SUBSCRIPTION.storiesThisMonth} <span className="text-foreground/40 text-sm">stories created</span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((p, i) => (
          <div
            key={p.id}
            style={{ animationDelay: `${200 + i * 100}ms` }}
            className={cn(
              "relative flex flex-col rounded-[32px] border bg-gradient-to-br p-7 animate-slide-up",
              p.accent,
              p.featured ? "border-star/50 ring-1 ring-star/30" : "border-hairline",
            )}
          >
            {p.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-star px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                Most magical
              </span>
            )}
            <h3 className="font-display text-2xl text-foreground">{p.name}</h3>
            <p className="mt-2">
              <span className="font-display text-4xl text-foreground">{p.price}</span>
              <span className="ml-1 text-sm text-foreground/55">/ {p.cadence}</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-foreground/80 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-mint">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={cn(
                "mt-8 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]",
                p.featured
                  ? "bg-primary text-primary-foreground shadow-[0_15px_40px_-20px_oklch(0.85_0.16_88/0.6)]"
                  : "border border-hairline bg-surface/60 text-foreground",
              )}
            >
              {p.id === "premium" ? "Current plan" : `Switch to ${p.name.split(" ")[0]}`}
            </button>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-[32px] border border-hairline bg-surface/60 p-6 animate-fade-in">
        <h3 className="font-display text-lg text-foreground mb-2">Payment method</h3>
        <p className="text-sm text-foreground/55">Visa ending in 4242 · expires 04/28</p>
        <button className="mt-3 text-sm text-lavender hover:underline">Update payment method →</button>
      </section>
    </AppShell>
  );
}
