import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StoryCover } from "@/components/cover";
import { getStory, getChild } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_authenticated/story/$id")({
  loader: ({ params }) => {
    const story = getStory(params.id);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.story.title ?? "Story"} — Adventure Club` },
      { name: "description", content: `A magical bedtime adventure: ${loaderData?.story.title}.` },
      { property: "og:title", content: loaderData?.story.title ?? "Adventure Club Story" },
      { property: "og:description", content: `A magical bedtime story from Adventure Club.` },
    ],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="grid place-items-center py-24 text-center">
        <h1 className="font-display text-3xl text-foreground">Story not found</h1>
        <Link to="/library" className="mt-4 text-lavender">← Back to library</Link>
      </div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="grid place-items-center py-24 text-center">
        <h1 className="font-display text-3xl text-foreground">Couldn't open this story</h1>
      </div>
    </AppShell>
  ),
  component: StoryReader,
});

function StoryReader() {
  const { story } = Route.useLoaderData();
  const child = getChild(story.childId);
  const [page, setPage] = useState(0);
  const [favorite, setFavorite] = useState<boolean>(story.favorite);
  const [reading, setReading] = useState<boolean>(false);

  const isCover = page === 0;
  const currentPage = story.pages[page - 1];
  const totalPages = story.pages.length + 1; // cover + content pages

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between animate-fade-in">
        <Link to="/library" className="text-xs text-foreground/55 hover:text-foreground">← Library</Link>
        <div className="flex items-center gap-2">
          <IconBtn label="Favorite" onClick={() => setFavorite((v) => !v)} active={favorite}>★</IconBtn>
          <IconBtn label={reading ? "Pause" : "Read aloud"} onClick={() => setReading((v) => !v)} active={reading}>
            {reading ? "❚❚" : "🔊"}
          </IconBtn>
          <IconBtn label="Download PDF">⬇</IconBtn>
          <button className="rounded-full border border-hairline bg-surface/60 px-4 py-2 text-xs font-medium text-foreground/50 cursor-not-allowed">
            Order Printed Book · Soon
          </button>
        </div>
      </div>

      {/* Book */}
      <div className="relative mx-auto max-w-3xl">
        <div
          key={page}
          className="overflow-hidden rounded-[32px] border border-hairline bg-paper text-ink animate-fade-in card-glow"
        >
          {isCover ? (
            <div className="p-2">
              <StoryCover emoji={story.coverEmoji} gradient={story.coverGradient} className="aspect-[4/5]" size="xl" />
              <div className="px-8 py-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">
                  An adventure starring {child?.name}
                </p>
                <h1 className="mt-3 font-display text-4xl md:text-5xl text-ink text-balance">{story.title}</h1>
                <p className="mt-4 text-ink/60">
                  {story.lengthMinutes}-minute {story.mood.toLowerCase()} story · {story.lesson}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <div className={cn("aspect-[4/3] relative overflow-hidden rounded-3xl bg-gradient-to-br", story.coverGradient)}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(1_0_0/0.15),transparent_60%)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-9xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-float">
                    {currentPage.sceneEmoji}
                  </span>
                </div>
              </div>
              <div className="px-8 py-10">
                <p className="font-display text-2xl md:text-3xl leading-relaxed text-ink text-balance">
                  {currentPage.text}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-hairline bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground/80 disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
            {page === 0 ? "Cover" : `Page ${page} of ${totalPages - 1}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-10 place-items-center rounded-full border text-sm transition-colors",
        active
          ? "border-star/60 bg-star/15 text-star"
          : "border-hairline bg-surface/60 text-foreground/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
