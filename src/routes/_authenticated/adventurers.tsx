import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CHILDREN, storiesForChild } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/adventurers")({
  head: () => ({
    meta: [
      { title: "My Adventurers — Adventure Club" },
      { name: "description", content: "Manage every child profile — looks, personality, and favorite things." },
      { property: "og:title", content: "My Adventurers — Adventure Club" },
      { property: "og:description", content: "Manage child profiles, looks, and personality." },
    ],
  }),
  component: AdventurersPage,
});

function AdventurersPage() {
  return (
    <AppShell>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 animate-slide-up">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">The heroes of every story</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">My Adventurers</h1>
        </div>
        <Link
          to="/adventurers/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.85_0.16_88/0.6)] hover:scale-[1.02] transition-transform"
        >
          <span>+</span> Add Adventurer
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CHILDREN.map((c, i) => {
          const stories = storiesForChild(c.id);
          return (
            <div
              key={c.id}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-slide-up overflow-hidden rounded-[32px] border border-hairline bg-surface card-glow"
            >
              <div className={`relative h-40 bg-gradient-to-br ${
                c.accent === "peach"
                  ? "from-peach/40 to-lavender/20"
                  : c.accent === "lavender"
                  ? "from-lavender/40 to-mint/20"
                  : c.accent === "mint"
                  ? "from-mint/40 to-star/20"
                  : "from-star/40 to-peach/20"
              }`}>
                <span className="absolute bottom-4 left-6 grid size-20 place-items-center rounded-full bg-paper text-5xl shadow-xl">
                  {c.avatarEmoji}
                </span>
                <span className="absolute top-4 right-4 rounded-full bg-ink/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-paper backdrop-blur">
                  Age {c.age}
                </span>
              </div>

              <div className="p-6 pt-12">
                <h3 className="font-display text-2xl text-foreground">{c.name}</h3>
                <p className="text-sm text-foreground/55">
                  Loves {c.favoriteAnimal.toLowerCase()}, {c.favoriteFood.toLowerCase()}, and {c.favoriteColor.toLowerCase()} skies.
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <Detail label="Personality" value={c.personality.join(" · ")} />
                  <Detail label="Wants to learn" value={c.wantsToLearn.join(" · ")} />
                  <Detail label="Hair" value={c.hairColor} />
                  <Detail label="Eyes" value={c.eyeColor} />
                </dl>

                <div className="mt-6 flex items-center justify-between border-t border-hairline pt-5">
                  <span className="text-xs text-foreground/50">{stories.length} adventures completed</span>
                  <div className="flex gap-2">
                    <button className="rounded-full border border-hairline bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground/80 hover:text-foreground">
                      Edit
                    </button>
                    <Link
                      to="/create"
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      New Story
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">{label}</dt>
      <dd className="text-foreground/85">{value}</dd>
    </div>
  );
}
