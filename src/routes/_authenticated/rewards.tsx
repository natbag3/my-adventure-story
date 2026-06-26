import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { REWARDS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards & Stars — Adventure Club" },
      { name: "description", content: "Stars, outfits, pets, and magic items earned across every adventure." },
      { property: "og:title", content: "Rewards & Stars — Adventure Club" },
      { property: "og:description", content: "Collect outfits, pets, and magic items as you read." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const progress = REWARDS.points / REWARDS.nextLevelAt;
  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">The treasure room</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Rewards & Stars</h1>
      </header>

      <section className="mb-10 grid gap-5 md:grid-cols-3 animate-slide-up [animation-delay:100ms]">
        <StatCard label="Stars Collected" value={`★ ${REWARDS.stars.toLocaleString()}`} accent="star" />
        <StatCard label="Adventure Points" value={REWARDS.points.toLocaleString()} accent="lavender" />
        <StatCard label="Explorer Level" value={`Level ${REWARDS.level}`} accent="peach" />
      </section>

      <section className="mb-12 rounded-[32px] border border-hairline bg-surface p-8 animate-slide-up [animation-delay:200ms]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl text-foreground">Next level</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
            {REWARDS.nextLevelAt - REWARDS.points} pts to go
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/8">
          <div className="h-full rounded-full bg-gradient-to-r from-star to-peach" style={{ width: `${progress * 100}%` }} />
        </div>
      </section>

      <Collection title="Outfits" items={REWARDS.outfits} />
      <Collection title="Magical Pets" items={REWARDS.pets} />
      <Collection title="Magic Items" items={REWARDS.items} />
    </AppShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "star" | "lavender" | "peach" }) {
  const map = {
    star: "from-star/25 to-peach/10",
    lavender: "from-lavender/25 to-mint/10",
    peach: "from-peach/25 to-star/10",
  };
  return (
    <div className={cn("rounded-3xl border border-hairline bg-gradient-to-br p-6", map[accent])}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </div>
  );
}

function Collection({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; emoji: string; owned: boolean }[];
}) {
  return (
    <section className="mb-10 animate-slide-up [animation-delay:300ms]">
      <h2 className="mb-4 font-display text-2xl text-foreground">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((i) => (
          <div
            key={i.id}
            className={cn(
              "rounded-3xl border border-hairline p-5 text-center",
              i.owned ? "bg-surface" : "bg-surface/40 opacity-50",
            )}
          >
            <div className={cn("mx-auto grid size-16 place-items-center rounded-2xl text-3xl mb-2",
              i.owned ? "bg-gradient-to-br from-star/20 to-peach/10" : "bg-foreground/5 grayscale")}>
              {i.emoji}
            </div>
            <p className="text-sm font-medium text-foreground">{i.label}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mt-1">
              {i.owned ? "Unlocked" : "Locked"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
