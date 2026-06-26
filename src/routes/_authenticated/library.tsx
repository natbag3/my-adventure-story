import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StoryCover } from "@/components/cover";
import { STORIES, CHILDREN, ADVENTURES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Story Library — Adventure Club" },
      { name: "description", content: "Every bedtime story you've created, saved in one magical library." },
      { property: "og:title", content: "Story Library — Adventure Club" },
      { property: "og:description", content: "All of your child's bedtime adventures, in one place." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [query, setQuery] = useState("");
  const [child, setChild] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = STORIES.filter((s) => {
    if (favoritesOnly && !s.favorite) return false;
    if (child !== "all" && s.childId !== child) return false;
    if (query && !s.title.toLowerCase().includes(query.toLowerCase()) && !s.adventure.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Your collection</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Story Library</h1>
        <p className="mt-2 text-foreground/55">{STORIES.length} adventures saved · revisit any tale, anytime.</p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3 animate-slide-up [animation-delay:120ms]">
        <div className="flex-1 min-w-[220px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or adventure…"
            className="w-full rounded-full border border-hairline bg-surface/60 px-5 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-lavender/60"
          />
        </div>
        <select
          value={child}
          onChange={(e) => setChild(e.target.value)}
          className="rounded-full border border-hairline bg-surface/60 px-4 py-3 text-sm text-foreground outline-none"
        >
          <option value="all">All adventurers</option>
          {CHILDREN.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn(
            "rounded-full border px-4 py-3 text-sm font-medium transition-colors",
            favoritesOnly
              ? "border-star/50 bg-star/15 text-star"
              : "border-hairline bg-surface/60 text-foreground/70 hover:text-foreground",
          )}
        >
          ★ Favorites
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s, i) => {
          const childObj = CHILDREN.find((c) => c.id === s.childId);
          const adv = ADVENTURES.find((a) => a.label === s.adventure);
          return (
            <Link
              key={s.id}
              to="/story/$id"
              params={{ id: s.id }}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group block animate-slide-up rounded-[28px] border border-hairline bg-surface/60 p-4 transition-all hover:-translate-y-1 hover:bg-surface"
            >
              <StoryCover emoji={s.coverEmoji} gradient={s.coverGradient} className="aspect-[4/3] mb-4" size="lg" />
              <div className="px-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/45">
                    {adv?.emoji} {s.adventure}
                  </span>
                  {s.favorite && <span className="text-star text-sm">★</span>}
                </div>
                <h3 className="font-display text-lg text-foreground line-clamp-2">{s.title}</h3>
                <p className="mt-1 text-xs text-foreground/50">
                  {childObj?.name} · {s.lengthMinutes} min · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full grid place-items-center rounded-[28px] border border-dashed border-hairline bg-surface/40 p-16 text-center">
            <span className="mb-3 text-5xl opacity-50">🌙</span>
            <p className="font-display text-xl text-foreground">No stories match those filters</p>
            <p className="mt-1 text-sm text-foreground/50">Try clearing your search or favorites filter.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
