import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChildSwitcher } from "@/components/child-switcher";
import { StoryCover } from "@/components/cover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveChild } from "@/lib/active-child-context";
import { StreakBadge } from "@/components/streak-badge";
import { StoryBookModal } from "@/components/story-book-modal";

type StoryRow = {
  id: string;
  title: string;
  theme: string;
  mood: string;
  lesson: string;
  length_minutes: number;
  cover_emoji: string;
  cover_gradient: string;
  favorite: boolean;
  created_at: string;
  child_id: string;
  series_id: string | null;
  series_part: number | null;
};

type SeriesRow = {
  id: string;
  title: string;
  total_parts: number;
  current_part: number;
  child_id: string;
};

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Story Library — Adventure Club" },
      { name: "description", content: "Every bedtime story you've created, saved in one magical library." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const { activeChild, children } = useActiveChild();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"active" | "all">("active");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("stories")
        .select(
          "id, title, theme, mood, lesson, length_minutes, cover_emoji, cover_gradient, favorite, created_at, child_id, series_id, series_part",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("story_series")
        .select("id, title, total_parts, current_part, child_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([storiesRes, seriesRes]) => {
      setStories((storiesRes.data ?? []) as StoryRow[]);
      setSeriesList((seriesRes.data ?? []) as SeriesRow[]);
      setLoading(false);
    });
  }, [user]);

  const filtered = stories.filter((s) => {
    if (favoritesOnly && !s.favorite) return false;
    if (scope === "active" && activeChild && s.child_id !== activeChild.id) return false;
    if (query && !s.title.toLowerCase().includes(query.toLowerCase()) && !s.theme.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const visibleSeries = seriesList.filter(
    (s) => scope === "all" || !activeChild || s.child_id === activeChild.id,
  );

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Your collection</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground flex flex-wrap items-center gap-3">
          <span>{activeChild ? `${activeChild.first_name}'s Story Library` : "Story Library"}</span>
          {activeChild && activeChild.streak_count > 0 && (
            <StreakBadge count={activeChild.streak_count} />
          )}
        </h1>
        <p className="mt-2 text-foreground/55">
          {loading ? "Loading…" : `${filtered.length} adventures saved · revisit any tale, anytime.`}
        </p>
        <div className="mt-5">
          <ChildSwitcher />
        </div>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3 animate-slide-up [animation-delay:120ms]">
        <div className="flex-1 min-w-[220px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or theme…"
            className="w-full rounded-full border border-hairline bg-surface/60 px-5 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-lavender/60"
          />
        </div>
        {children.length > 1 && (
          <div className="flex rounded-full border border-hairline bg-surface/60 p-1">
            {(["active", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  scope === s
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/55 hover:text-foreground",
                )}
              >
                {s === "active" ? `Just ${activeChild?.first_name ?? "active"}` : "All children"}
              </button>
            ))}
          </div>
        )}
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

      {visibleSeries.length > 0 && (
        <section className="mb-10 animate-slide-up">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-lavender/80">
            📖 Story series
          </p>
          <div className="space-y-6">
            {visibleSeries.map((series) => {
              const parts = stories
                .filter((s) => s.series_id === series.id)
                .sort((a, b) => (a.series_part ?? 0) - (b.series_part ?? 0));
              const childObj = children.find((c) => c.id === series.child_id);
              const nextPart = Math.min(series.current_part, series.total_parts);
              const complete = parts.length >= series.total_parts;
              return (
                <div
                  key={series.id}
                  className="rounded-[28px] border border-hairline bg-surface/60 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl text-foreground">
                        {series.title}
                      </h3>
                      <p className="text-xs text-foreground/50">
                        {childObj?.first_name} · {parts.length} of {series.total_parts} parts{complete ? " · Complete 🎉" : ""}
                      </p>
                    </div>
                    {!complete && (
                      <Link
                        to="/create"
                        className="rounded-full bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary"
                      >
                        Continue → Part {nextPart}
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {Array.from({ length: series.total_parts }).map((_, idx) => {
                      const partNum = idx + 1;
                      const story = parts.find((p) => p.series_part === partNum);
                      const locked = !story;
                      const inner = (
                        <div
                          className={cn(
                            "relative w-40 shrink-0 rounded-2xl border p-2 transition-all",
                            locked
                              ? "border-dashed border-hairline bg-surface/40 opacity-60"
                              : "border-hairline bg-surface hover:-translate-y-0.5",
                          )}
                        >
                          {story ? (
                            <StoryCover
                              emoji={story.cover_emoji}
                              gradient={story.cover_gradient}
                              className="aspect-[4/3] mb-2"
                              size="lg"
                            />
                          ) : (
                            <div className="aspect-[4/3] mb-2 grid place-items-center rounded-xl bg-surface-elevated text-3xl opacity-50">
                              🔒
                            </div>
                          )}
                          <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-foreground/50">
                            Part {partNum}
                          </p>
                          <p className="px-1 font-display text-sm text-foreground line-clamp-1">
                            {story?.title ?? "Not yet written"}
                          </p>
                        </div>
                      );
                      return story ? (
                        <Link
                          key={partNum}
                          to="/story/$id"
                          params={{ id: story.id }}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={partNum}>{inner}</div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s, i) => {
          const childObj = children.find((c) => c.id === s.child_id);
          return (
            <Link
              key={s.id}
              to="/story/$id"
              params={{ id: s.id }}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group block animate-slide-up rounded-[28px] border border-hairline bg-surface/60 p-4 transition-all hover:-translate-y-1 hover:bg-surface"
            >
              <StoryCover emoji={s.cover_emoji} gradient={s.cover_gradient} className="aspect-[4/3] mb-4" size="lg" />
              <div className="px-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/45">
                    {s.theme}
                  </span>
                  {s.favorite && <span className="text-star text-sm">★</span>}
                </div>
                <h3 className="font-display text-lg text-foreground line-clamp-2">{s.title}</h3>
                <p className="mt-1 text-xs text-foreground/50">
                  {childObj?.first_name} · {s.length_minutes} min · {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full grid place-items-center rounded-[28px] border border-dashed border-hairline bg-surface/40 p-16 text-center">
            <span className="mb-3 text-5xl opacity-50">🌙</span>
            <p className="font-display text-xl text-foreground">
              {stories.length === 0
                ? "No stories yet"
                : scope === "active"
                ? `${activeChild?.first_name ?? "This adventurer"} has no stories yet`
                : "No stories match those filters"}
            </p>
            <p className="mt-1 text-sm text-foreground/50">
              {stories.length === 0
                ? "Create your first adventure to fill the library."
                : "Try clearing your search or favorites filter."}
            </p>
            <Link to="/create" className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
              Create Tonight's Adventure ✨
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
