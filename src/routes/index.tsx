import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Adventure Club — Bedtime stories starring YOUR child" },
      {
        name: "description",
        content:
          "Personalised, illustrated, rhyming bedtime adventures — generated in seconds, treasured forever.",
      },
      { property: "og:title", content: "Adventure Club — Bedtime stories starring YOUR child" },
      {
        property: "og:description",
        content:
          "Personalised, illustrated, rhyming bedtime adventures — generated in seconds, treasured forever.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function AmbientSky() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-lavender/15 blur-[140px]" />
      <div className="absolute -bottom-[10%] -left-[10%] h-[55%] w-[55%] rounded-full bg-peach/12 blur-[120px]" />
      <div className="absolute top-1/3 left-1/2 h-[30%] w-[30%] -translate-x-1/2 rounded-full bg-mint/8 blur-[120px]" />
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => {
          const top = (i * 53) % 100;
          const left = (i * 37 + 7) % 100;
          const delay = (i % 7) * 0.4;
          const size = (i % 3) + 1;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-star/70 shadow-[0_0_8px_currentColor] animate-twinkle"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Create your adventurer",
    body: "Add your child's name, appearance and personality so every hero is unmistakably them.",
    emoji: "🧒",
  },
  {
    n: "02",
    title: "Choose tonight's adventure",
    body: "Pick a magical world, a mood, and the gentle lesson you'd like woven in.",
    emoji: "🗺️",
  },
  {
    n: "03",
    title: "Read together",
    body: "Your personalised illustrated story is ready in seconds — cuddle up and read.",
    emoji: "🌙",
  },
];

const FEATURES = [
  { emoji: "✨", title: "AI illustrations", body: "Beautiful hand-painted-style artwork on every page." },
  { emoji: "🎙️", title: "Audio narration", body: "Four warm voices bring every story to life." },
  { emoji: "📚", title: "Saved forever", body: "Every story lives in your library — read again anytime." },
  { emoji: "🌍", title: "Magical worlds", body: "Choose from dozens of themes, worlds and moods." },
  { emoji: "🎂", title: "Special occasions", body: "Birthdays, Christmas and once-in-a-lifetime moments." },
  { emoji: "📖", title: "Natural lessons", body: "Kindness, courage and curiosity — woven, never preachy." },
];

const PLANS = [
  {
    name: "Starter",
    emoji: "🌱",
    priceMonthly: "$5.99",
    priceYearly: "$57.99",
    tagline: "A bedtime habit",
    features: ["10 stories per month", "2 child profiles", "HD illustrations"],
    highlight: false,
  },
  {
    name: "Explorer",
    emoji: "🚀",
    priceMonthly: "$12.99",
    priceYearly: "$124.99",
    tagline: "Most popular",
    features: ["25 stories per month", "🎙️ Voice narration", "3 child profiles", "HD illustrations"],
    highlight: true,
  },
  {
    name: "Unlimited",
    emoji: "🌌",
    priceMonthly: "$19.99",
    priceYearly: "$191.99",
    tagline: "Every night, forever",
    features: ["Unlimited stories", "🎙️ Voice narration", "Unlimited profiles", "Everything in Explorer"],
    highlight: false,
  },
];

function LandingPage() {
  const pricingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    track("landing_page_viewed");
  }, []);

  useEffect(() => {
    const el = pricingRef.current;
    if (!el) return;
    let fired = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired) {
            fired = true;
            track("pricing_section_viewed");
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleCta = (location: string) => () => {
    track("get_started_clicked", { location });
  };

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen magical-bg">
      <AmbientSky />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-hairline/60 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-star to-peach shadow-[0_0_20px_oklch(0.85_0.16_88/0.35)]">
              <span className="font-display text-base font-bold text-ink">A</span>
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              Adventure Club
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              onClick={handleCta("header")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.85_0.16_88/0.5)] transition-transform hover:scale-[1.03]"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5">
        {/* HERO */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 text-center animate-slide-up">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-hairline bg-surface/60 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">
            <span className="size-1.5 rounded-full bg-star shadow-[0_0_10px_var(--star)]" />
            Bedtime, reimagined
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-5xl md:text-7xl font-medium leading-[1.05] text-foreground text-balance">
            Bedtime stories starring{" "}
            <span className="italic text-peach">YOUR</span> child{" "}
            <span className="inline-block animate-float">🌙</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-foreground/65 text-pretty">
            Personalised, illustrated, rhyming adventures — generated in seconds, treasured forever.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth"
              onClick={handleCta("hero")}
              className="w-full sm:w-auto rounded-2xl bg-primary px-7 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_24px_60px_-20px_oklch(0.85_0.16_88/0.45)] transition-transform hover:scale-[1.03]"
            >
              Start for free
            </Link>
            <a
              href="#how-it-works"
              onClick={scrollToFeatures}
              className="w-full sm:w-auto rounded-2xl border border-hairline bg-surface/60 px-7 py-4 font-display text-lg font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              See how it works
            </a>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-16 md:py-20 scroll-mt-24">
          <div className="mb-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">How it works</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-medium text-foreground">
              Three steps to tonight's story
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-[32px] border border-hairline bg-surface/60 p-7 backdrop-blur-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-lavender/15 text-3xl">
                    {s.emoji}
                  </span>
                  <span className="font-mono text-xs font-bold tracking-widest text-foreground/30">
                    {s.n}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-2xl text-foreground">{s.title}</h3>
                <p className="text-foreground/60">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-16 md:py-20">
          <div className="mb-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">What's inside</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-medium text-foreground">
              Every story, magical
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-[28px] border border-hairline bg-surface/50 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-surface"
              >
                <span className="mb-4 inline-grid size-12 place-items-center rounded-xl bg-mint/15 text-2xl">
                  {f.emoji}
                </span>
                <h3 className="mb-1 font-display text-lg text-foreground">{f.title}</h3>
                <p className="text-sm text-foreground/60">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" ref={pricingRef} className="py-16 md:py-20 scroll-mt-24">
          <div className="mb-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Pricing</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-medium text-foreground">
              Pick your adventure plan
            </h2>
            <p className="mt-3 text-foreground/60">Cancel anytime. Save 20% with yearly.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  "relative flex flex-col rounded-[32px] p-7 backdrop-blur-sm transition-all " +
                  (p.highlight
                    ? "border-2 border-star/60 bg-gradient-to-b from-star/10 to-lavender/10 shadow-[0_30px_80px_-30px_oklch(0.85_0.16_88/0.5)] md:-translate-y-2"
                    : "border border-hairline bg-surface/60")
                }
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-star px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                    Most popular
                  </span>
                )}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <h3 className="font-display text-2xl text-foreground">{p.name}</h3>
                    <p className="text-xs text-foreground/50">{p.tagline}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-bold text-foreground">{p.priceMonthly}</span>
                    <span className="text-sm text-foreground/50">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/50">
                    or {p.priceYearly}/year
                  </p>
                </div>
                <ul className="mb-8 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/75">
                      <span className="mt-0.5 text-star">✦</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  onClick={handleCta(`pricing_${p.name.toLowerCase()}`)}
                  className={
                    "block rounded-2xl px-5 py-3 text-center font-semibold transition-transform hover:scale-[1.02] " +
                    (p.highlight
                      ? "bg-primary text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.85_0.16_88/0.5)]"
                      : "border border-hairline bg-surface text-foreground")
                  }
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-20">
          <div className="rounded-[36px] border border-hairline bg-gradient-to-br from-lavender/20 via-surface/50 to-peach/15 p-10 md:p-14 text-center backdrop-blur-sm">
            <h2 className="font-display text-3xl md:text-5xl font-medium text-foreground text-balance">
              Tonight's story is waiting
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-foreground/65">
              Join thousands of families making bedtime the best part of the day.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-block rounded-2xl bg-primary px-8 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_24px_60px_-20px_oklch(0.85_0.16_88/0.45)] transition-transform hover:scale-[1.03]"
            >
              Start for free
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-hairline/60 mt-10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-5 text-xs text-foreground/50">
          <p>© 2026 Adventure Club</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground/80 transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground/80 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
