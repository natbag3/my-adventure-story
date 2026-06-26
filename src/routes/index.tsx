import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StoryCover } from "@/components/cover";
import {
  PARENT_NAME,
  STORIES,
  CHILDREN,
  PASSPORT_STAMPS,
  REWARDS,
  SUBSCRIPTION,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Adventure Club — Tonight's Bedtime Story" },
      {
        name: "description",
        content:
          "Pick tonight's bedtime adventure. AI-generated children's stories starring your own child, ready in a minute.",
      },
      { property: "og:title", content: "Adventure Club — Tonight's Bedtime Story" },
      {
        property: "og:description",
        content: "Magical AI bedtime stories where your child is always the hero.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const inProgress = STORIES.find((s) => s.progress < 1) ?? STORIES[0];
  const unlockedStamps = PASSPORT_STAMPS.filter((s) => s.unlockedAt);
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <AppShell>
      {/* HERO */}
      <section className="mb-12 animate-slide-up">
        <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">
          <span>Evening Ritual</span>
          <span className="h-px w-8 bg-foreground/20" />
          <span>{time}</span>
        </div>
        <h1 className="mb-7 font-display text-5xl md:text-6xl font-medium leading-[1.05] text-foreground text-balance">
          Good Evening, <span className="italic text-peach">{PARENT_NAME}</span>{" "}
          <span className="inline-block animate-float">🌙</span>
        </h1>

        <Link
          to="/create"
          className="group relative inline-flex items-center gap-4 overflow-hidden rounded-2xl bg-primary px-7 py-5 shadow-[0_24px_60px_-20px_oklch(0.85_0.16_88/0.45)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <span className="grid size-10 place-items-center rounded-full bg-ink/10">
            <span className="block size-4 rotate-45 rounded-sm border-2 border-ink/80" />
          </span>
          <span className="text-left">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45">
              Ready to dream?
            </span>
            <span className="font-display text-xl font-bold text-ink">
              Create Tonight's Adventure
            </span>
          </span>
        </Link>
      </section>

      {/* MAIN GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up [animation-delay:120ms]">
        {/* Continue reading */}
        <Link
          to="/story/$id"
          params={{ id: inProgress.id }}
          className="group relative md:col-span-2 overflow-hidden rounded-[32px] bg-paper p-8 transition-all hover:ring-4 hover:ring-lavender/25 card-glow min-h-[320px] flex flex-col justify-between"
        >
          <div className="relative z-10 max-w-sm">
            <span className="mb-4 inline-block rounded-full bg-lavender/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-lavender">
              Continue Reading
            </span>
            <h3 className="mb-2 font-display text-3xl text-ink">{inProgress.title}</h3>
            <p className="text-pretty text-ink/55 text-sm">
              Pick up where {CHILDREN.find((c) => c.id === inProgress.childId)?.name} left off in the {inProgress.adventure} adventure.
            </p>
          </div>
          <div className="relative z-10 mt-auto max-w-sm">
            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-ink/8">
              <div className="h-full bg-lavender" style={{ width: `${inProgress.progress * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-ink/40">
              {Math.round(inProgress.progress * 100)}% complete · {inProgress.lengthMinutes - Math.round(inProgress.lengthMinutes * inProgress.progress)} min left
            </span>
          </div>
          <div className="absolute -right-6 -top-2 h-full w-2/3 opacity-[0.18] transition-opacity group-hover:opacity-30">
            <StoryCover emoji={inProgress.coverEmoji} gradient={inProgress.coverGradient} className="h-full w-full" size="xl" />
          </div>
        </Link>

        {/* Library */}
        <Link
          to="/library"
          className="group flex flex-col justify-center rounded-[32px] border border-hairline bg-mint/15 p-7 text-center transition-all hover:-translate-y-1 hover:bg-mint/25"
        >
          <span className="mx-auto mb-5 grid size-16 rotate-3 place-items-center rounded-2xl bg-paper text-3xl shadow-xl shadow-mint/20 transition-transform group-hover:rotate-0">
            📚
          </span>
          <h3 className="font-display text-xl text-foreground">Story Library</h3>
          <p className="mt-1 text-sm text-foreground/60">{STORIES.length} saved adventures</p>
        </Link>

        {/* Passport */}
        <Link
          to="/passport"
          className="group flex flex-col justify-between rounded-[32px] border border-hairline bg-surface p-7"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-display text-xl text-foreground">Adventure Passport</h3>
            <span className="grid size-8 place-items-center rounded-full border border-star/50 font-mono text-[9px] italic text-star">
              NEW
            </span>
          </div>
          <div className="mt-6 flex gap-2">
            {PASSPORT_STAMPS.slice(0, 4).map((s) => (
              <span
                key={s.id}
                className={
                  "grid size-10 place-items-center rounded-full border border-hairline bg-surface-elevated text-lg " +
                  (s.unlockedAt ? "shadow-[0_0_15px_oklch(1_0_0/0.12)]" : "opacity-40")
                }
              >
                {s.emoji}
              </span>
            ))}
          </div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-foreground/40">
            {unlockedStamps.length} stamps earned
          </p>
        </Link>

        {/* Adventurers */}
        <Link
          to="/adventurers"
          className="group flex items-center gap-4 rounded-[32px] border border-hairline bg-surface/60 p-6 backdrop-blur-sm transition-all hover:bg-surface"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-peach/20 text-xl text-peach">👤</span>
          <div>
            <h4 className="font-medium text-foreground">My Adventurers</h4>
            <p className="text-xs text-foreground/45">{CHILDREN.length} child profiles</p>
          </div>
        </Link>

        {/* Rewards */}
        <Link
          to="/rewards"
          className="group flex items-center gap-4 rounded-[32px] border border-hairline bg-surface/60 p-6 backdrop-blur-sm transition-all hover:bg-surface"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-star/20 text-xl text-star">✨</span>
          <div>
            <h4 className="font-medium text-foreground">Rewards & Stars</h4>
            <p className="text-xs text-foreground/45">{REWARDS.stars.toLocaleString()} stars · Lvl {REWARDS.level}</p>
          </div>
        </Link>

        {/* Subscription */}
        <Link
          to="/subscription"
          className="group flex items-center gap-4 rounded-[32px] border border-hairline bg-surface/60 p-6 backdrop-blur-sm transition-all hover:bg-surface"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-lavender/20 text-xl text-lavender">💫</span>
          <div>
            <h4 className="font-medium text-foreground">Subscription</h4>
            <p className="text-xs text-foreground/45">{SUBSCRIPTION.plan}</p>
          </div>
        </Link>
      </section>
    </AppShell>
  );
}
