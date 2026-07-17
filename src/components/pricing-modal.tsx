import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TIERS, formatUSD, yearlySavings, type Interval, type Tier } from "@/lib/subscription";
import { createCheckoutSession } from "@/lib/subscription.functions";

const PAID: readonly Tier[] = ["starter", "explorer", "unlimited"];

export function PricingModal({
  open,
  onOpenChange,
  title,
  subtitle,
  currentTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  subtitle?: string;
  currentTier?: Tier;
}) {
  const [interval, setInterval] = useState<Interval>("month");
  const [busyTier, setBusyTier] = useState<Tier | null>(null);
  const checkout = useServerFn(createCheckoutSession);

  async function pick(tier: Tier) {
    if (tier === "free") return;
    setBusyTier(tier);
    try {
      const { url } = await checkout({
        data: { tier, interval, origin: window.location.origin },
      });
      window.location.href = url;
    } catch (e) {
      setBusyTier(null);
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {title ?? "Choose your plan"}
          </DialogTitle>
          {subtitle && (
            <DialogDescription>{subtitle}</DialogDescription>
          )}
        </DialogHeader>

        {/* Interval toggle */}
        <div className="mt-2 flex items-center justify-center">
          <div className="inline-flex rounded-full border border-hairline bg-surface/60 p-1">
            {(["month", "year"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setInterval(v)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  interval === v
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:text-foreground",
                )}
              >
                {v === "month" ? "Monthly" : "Yearly"}
                {v === "year" && (
                  <span className="ml-2 rounded-full bg-mint/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-mint">
                    Save 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {PAID.map((tid) => {
            const t = TIERS[tid];
            const price = interval === "month" ? t.priceMonthly : t.priceYearly;
            const cadence = interval === "month" ? "/ month" : "/ year";
            const featured = tid === "explorer";
            const isCurrent = currentTier === tid;
            const savings = interval === "year" ? yearlySavings(tid) : 0;
            return (
              <div
                key={tid}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-5 bg-gradient-to-br",
                  featured
                    ? "border-star/50 ring-1 ring-star/30 from-star/15 to-peach/10"
                    : "border-hairline from-surface to-surface-elevated",
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-5 rounded-full bg-star px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                    Most popular
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl">{t.emoji}</span>
                  <h3 className="font-display text-xl text-foreground">{t.name}</h3>
                </div>
                <p className="mt-1 text-xs text-foreground/55">{t.tagline}</p>
                <p className="mt-4">
                  <span className="font-display text-3xl text-foreground">{formatUSD(price)}</span>
                  <span className="ml-1 text-xs text-foreground/55">{cadence}</span>
                </p>
                {interval === "year" && savings > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-mint">
                    Save {formatUSD(savings)} · 20% off
                  </p>
                )}
                <ul className="mt-4 space-y-1.5 text-sm text-foreground/80 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-mint">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => pick(tid)}
                  disabled={isCurrent || busyTier !== null}
                  className={cn(
                    "mt-5 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100",
                    featured
                      ? "bg-primary text-primary-foreground shadow-[0_15px_40px_-20px_oklch(0.85_0.16_88/0.6)]"
                      : "border border-hairline bg-surface/60 text-foreground",
                  )}
                >
                  {isCurrent
                    ? "Current plan"
                    : busyTier === tid
                      ? "Redirecting…"
                      : "Choose plan"}
                </button>
              </div>
            );
          })}
        </section>

        <p className="mt-2 text-center text-[11px] text-foreground/45">
          Prices in USD. Stripe handles local currency conversion at checkout.
        </p>
      </DialogContent>
    </Dialog>
  );
}
