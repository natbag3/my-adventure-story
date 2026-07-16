import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChildSwitcher } from "@/components/child-switcher";
import { CharacterAvatar } from "@/components/character-avatar";
import { StoryCover } from "@/components/cover";
import { useActiveChild } from "@/lib/active-child-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { StreakBadge } from "@/components/streak-badge";

type StoryRow = {
  id: string;
  title: string;
  theme: string;
  cover_emoji: string;
  cover_gradient: string;
  length_minutes: number;
  progress: number;
  child_id: string;
};

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Adventure Club — Tonight's Bedtime Story" },
      {
        name: "description",
        content:
          "Pick tonight's bedtime adventure. AI-generated children's stories starring your own child, ready in a minute.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { activeChild, children } = useActiveChild();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const ritualLabel = `${partOfDay.charAt(0).toUpperCase()}${partOfDay.slice(1)} Ritual`;
  const greeting = `Good ${partOfDay}`;

  useEffect(() => {
    if (!user || !activeChild) {
      setStories([]);
      return;
    }
    supabase
      .from("stories")
      .select("id, title, theme, cover_emoji, cover_gradient, length_minutes, progress, child_id")
      .eq("user_id", user.id)
      .eq("child_id", activeChild.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setStories((data ?? []) as StoryRow[]));
  }, [user, activeChild]);

  const inProgress = stories.find((s) => s.progress > 0 && s.progress < 1) ?? stories[0];
  const totalStories = stories.length;

  return (
    <AppShell>
      {/* HERO */}
      <section className="mb-10 animate-slide-up">
        <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">
          <span>Evening Ritual</span>
          <span className="h-px w-8 bg-foreground/20" />
          <span>{time}</span>
        </div>
        <h1 className="mb-5 font-display text-5xl md:text-6xl font-medium leading-[1.05] text-foreground text-balance">
          Good evening,{" "}
          <span className="italic text-peach">
            {activeChild?.first_name ?? "little explorer"}
          </span>{" "}
          <span className="inline-block animate-float">🌙</span>
        </h1>
        <p className="mb-6 text-foreground/65 text-lg">Ready for tonight's adventure?</p>
        {activeChild && activeChild.streak_count > 0 && (
          <div className="mb-6">
            <StreakBadge count={activeChild.streak_count} />
          </div>
        )}

        <div className="mb-7 flex flex-wrap items-center gap-3">
          <ChildSwitcher />
        </div>

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
        {/* Continue / Hero card */}
        {inProgress ? (
          <Link
            to="/story/$id"
            params={{ id: inProgress.id }}
            className="group relative md:col-span-2 overflow-hidden rounded-[32px] bg-paper p-8 transition-all hover:ring-4 hover:ring-lavender/25 card-glow min-h-[320px] flex flex-col justify-between"
          >
            <div className="relative z-10 max-w-sm">
              <span className="mb-4 inline-block rounded-full bg-lavender/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-lavender">
                {inProgress.progress > 0 && inProgress.progress < 1 ? "Continue Reading" : "Latest Story"}
              </span>
              <h3 className="mb-2 font-display text-3xl text-ink">{inProgress.title}</h3>
              <p className="text-pretty text-ink/55 text-sm">
                {activeChild?.first_name}'s {inProgress.theme.toLowerCase()} adventure.
              </p>
            </div>
            <div className="relative z-10 mt-auto max-w-sm">
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full bg-lavender"
                  style={{ width: `${Math.max(inProgress.progress, 0.05) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-ink/40">
                {inProgress.length_minutes} min story
              </span>
            </div>
            <div className="absolute -right-6 -top-2 h-full w-2/3 opacity-[0.18] transition-opacity group-hover:opacity-30">
              <StoryCover
                emoji={inProgress.cover_emoji}
                gradient={inProgress.cover_gradient}
                className="h-full w-full"
                size="xl"
              />
            </div>
          </Link>
        ) : (
          <Link
            to="/create"
            className="group relative md:col-span-2 overflow-hidden rounded-[32px] bg-gradient-to-br from-lavender/25 to-peach/15 p-10 transition-all hover:ring-4 hover:ring-lavender/25 card-glow min-h-[320px] flex flex-col justify-center"
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-lavender">
              Tonight is the first chapter
            </p>
            <h3 className="font-display text-3xl text-foreground">
              Create {activeChild?.first_name}'s first adventure ✨
            </h3>
            <p className="mt-2 max-w-md text-foreground/65">
              A magical bedtime story where {activeChild?.first_name} is the hero. Ready in
              under a minute.
            </p>
          </Link>
        )}

        {/* Library */}
        <Link
          to="/library"
          className="group flex flex-col justify-center rounded-[32px] border border-hairline bg-mint/15 p-7 text-center transition-all hover:-translate-y-1 hover:bg-mint/25"
        >
          <span className="mx-auto mb-5 grid size-16 rotate-3 place-items-center rounded-2xl bg-paper text-3xl shadow-xl shadow-mint/20 transition-transform group-hover:rotate-0">
            📚
          </span>
          <h3 className="font-display text-xl text-foreground">{activeChild?.first_name}'s Library</h3>
          <p className="mt-1 text-sm text-foreground/60">{totalStories} saved adventures</p>
        </Link>

        {/* Passport */}
        <Link
          to="/passport"
          className="group flex flex-col justify-between rounded-[32px] border border-hairline bg-surface p-7"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-display text-xl text-foreground">Adventure Passport</h3>
            <span className="grid size-8 place-items-center rounded-full border border-star/50 font-mono text-[9px] italic text-star">
              {totalStories}
            </span>
          </div>
          <p className="mt-5 text-sm text-foreground/55">
            Stamps, badges, and worlds {activeChild?.first_name} has explored.
          </p>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-foreground/40">
            Read more to unlock
          </p>
        </Link>

        {/* Adventurers grid: switch between any child */}
        <div className="md:col-span-3 rounded-[32px] border border-hairline bg-surface/60 p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
                Switch adventurer
              </p>
              <h3 className="font-display text-xl text-foreground">My Adventurers</h3>
            </div>
            <Link
              to="/onboarding"
              className="text-xs text-lavender hover:underline"
            >
              + Add new
            </Link>
          </div>
          <ChildPills />
        </div>

        {/* Subscription */}
        <Link
          to="/subscription"
          className="group flex items-center gap-4 rounded-[32px] border border-hairline bg-surface/60 p-6 backdrop-blur-sm transition-all hover:bg-surface"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-lavender/20 text-xl text-lavender">💫</span>
          <div>
            <h4 className="font-medium text-foreground">Subscription</h4>
            <p className="text-xs text-foreground/45">Adventure Club Premium</p>
          </div>
        </Link>

        {/* Parent settings */}
        <Link
          to="/settings"
          className="group flex items-center gap-4 rounded-[32px] border border-hairline bg-surface/60 p-6 backdrop-blur-sm transition-all hover:bg-surface"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-peach/20 text-xl text-peach">👤</span>
          <div>
            <h4 className="font-medium text-foreground">Parent Account</h4>
            <p className="text-xs text-foreground/45">{children.length} child profile{children.length === 1 ? "" : "s"}</p>
          </div>
        </Link>
      </section>
    </AppShell>
  );
}

function ChildPills() {
  const { children, activeChild, setActiveChildId } = useActiveChild();
  return (
    <div className="flex flex-wrap gap-3">
      {children.map((c) => {
        const active = c.id === activeChild?.id;
        return (
          <button
            key={c.id}
            onClick={() => setActiveChildId(c.id)}
            className={
              "flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition-all " +
              (active
                ? "border-star/60 bg-star/15 text-foreground scale-[1.02]"
                : "border-hairline bg-surface-elevated text-foreground/70 hover:border-foreground/30")
            }
          >
            <span className="overflow-hidden grid size-8 place-items-center rounded-full bg-surface text-base">
              <CharacterAvatar
                portraitPath={c.portrait_url}
                alt={c.first_name}
                className="size-full"
              />
            </span>
            <span>
              {c.first_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
