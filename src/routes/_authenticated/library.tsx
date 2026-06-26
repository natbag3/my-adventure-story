import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChildSwitcher } from "@/components/child-switcher";
import { StoryCover } from "@/components/cover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveChild } from "@/lib/active-child-context";

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
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"active" | "all">("active");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("stories")
      .select("id, title, theme, mood, lesson, length_minutes, cover_emoji, cover_gradient, favorite, created_at, child_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setStories((data ?? []) as StoryRow[]);
        setLoading(false);
      });
  }, [user]);

  const filtered = stories.filter((s) => {
    if (favoritesOnly && !s.favorite) return false;
    if (scope === "active" && activeChild && s.child_id !== activeChild.id) return false;
    if (query && !s.title.toLowerCase().includes(query.toLowerCase()) && !s.theme.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Your collection</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">
          {activeChild ? `${activeChild.first_name}'s Story Library` : "Story Library"}
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
