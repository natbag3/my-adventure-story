import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PASSPORT_STAMPS, ACHIEVEMENTS, REWARDS, CHILDREN } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_authenticated/passport")({
  head: () => ({
    meta: [
      { title: "Adventure Passport — Adventure Club" },
      { name: "description", content: "A magical passport that grows with every bedtime story." },
      { property: "og:title", content: "Adventure Passport — Adventure Club" },
      { property: "og:description", content: "Stamps, badges, and levels earned through every adventure." },
    ],
  }),
  component: PassportPage,
});

function PassportPage() {
  const unlocked = PASSPORT_STAMPS.filter((s) => s.unlockedAt);
  const locked = PASSPORT_STAMPS.filter((s) => !s.unlockedAt);
  const progress = REWARDS.points / REWARDS.nextLevelAt;

  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Worlds explored</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Adventure Passport</h1>
        <p className="mt-2 text-foreground/55 max-w-xl">
          Every story unlocks a new stamp. {CHILDREN[0].name} is collecting memories from across the galaxy.
        </p>
      </header>

      {/* Explorer level card */}
      <section className="mb-10 overflow-hidden rounded-[32px] border border-hairline bg-gradient-to-br from-surface to-surface-elevated p-8 card-glow animate-slide-up [animation-delay:100ms]">
        <div className="flex flex-wrap items-center gap-8">
          <div className="grid size-24 place-items-center rounded-3xl bg-gradient-to-tr from-star to-peach text-4xl shadow-[0_0_30px_oklch(0.85_0.16_88/0.4)]">
            🛂
          </div>
          <div className="flex-1 min-w-[240px]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">Explorer Level</p>
            <p className="font-display text-4xl text-foreground">Level {REWARDS.level} · Junior Voyager</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
              <div className="h-full rounded-full bg-gradient-to-r from-star to-peach" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-foreground/55">
              {REWARDS.points} / {REWARDS.nextLevelAt} adventure points to Level {REWARDS.level + 1}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">Stars</p>
            <p className="font-display text-3xl text-star">★ {REWARDS.stars.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* Stamps */}
      <section className="mb-12 animate-slide-up [animation-delay:200ms]">
        <h2 className="mb-5 font-display text-2xl text-foreground">Passport Stamps</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...unlocked, ...locked].map((s) => (
            <div
              key={s.id}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-3xl border border-hairline p-6 text-center transition-all",
                s.unlockedAt
                  ? "bg-surface hover:-translate-y-1"
                  : "bg-surface/40 opacity-50",
              )}
            >
              <div
                className={cn(
                  "grid size-16 place-items-center rounded-full text-3xl",
                  s.unlockedAt
                    ? "bg-gradient-to-br from-star/30 to-peach/20 shadow-[0_0_20px_oklch(0.85_0.16_88/0.3)]"
                    : "bg-foreground/5 grayscale",
                )}
              >
                {s.emoji}
              </div>
              <p className="font-display text-sm text-foreground">{s.label}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">
                {s.unlockedAt ? new Date(s.unlockedAt).toLocaleDateString() : "Locked"}
              </p>
              {s.unlockedAt && (
                <span className="absolute top-3 right-3 text-star text-xs">★</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="animate-slide-up [animation-delay:300ms]">
        <h2 className="mb-5 font-display text-2xl text-foreground">Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-4 rounded-3xl border border-hairline p-5",
                a.unlocked ? "bg-surface" : "bg-surface/40 opacity-60",
              )}
            >
              <div
                className={cn(
                  "grid size-14 place-items-center rounded-2xl text-2xl",
                  a.unlocked
                    ? "bg-gradient-to-br from-lavender/30 to-peach/20"
                    : "bg-foreground/5 grayscale",
                )}
              >
                {a.emoji}
              </div>
              <div>
                <p className="font-display text-base text-foreground">{a.label}</p>
                <p className="text-xs text-foreground/55">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
