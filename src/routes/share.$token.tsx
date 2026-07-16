import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { StoryCover } from "@/components/cover";
import { cn } from "@/lib/utils";
import { getSharedStory, type SharedStory } from "@/lib/shared-story.functions";

export const Route = createFileRoute("/share/$token")({
  head: ({ loaderData }: { loaderData?: SharedStory }) => {
    const title = loaderData?.title
      ? `${loaderData.title} — Adventure Club`
      : "A shared adventure — Adventure Club";
    const description = loaderData
      ? `A bedtime story starring ${loaderData.child_first_name}, made with Adventure Club.`
      : "A magical bedtime adventure shared from Adventure Club.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params }) => {
    const story = await getSharedStory({ data: { token: params.token } });
    if (!story) throw notFound();
    return story;
  },
  notFoundComponent: SharedNotFound,
  errorComponent: () => <SharedNotFound />,
  component: SharedStoryPage,
});

function SharedNotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="text-center">
        <span className="text-6xl">🌙</span>
        <h1 className="mt-4 font-display text-3xl">This story isn't available</h1>
        <p className="mt-2 text-foreground/60">
          The link may have expired or been removed.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Visit Adventure Club
        </a>
      </div>
    </div>
  );
}

function SharedStoryPage() {
  const story = Route.useLoaderData();
  const [page, setPage] = useState(0);

  const totalPages = story.pages.length;
  const isCover = page === 0;
  const isEnd = page === totalPages + 1;
  const storyPageIdx = page - 1;
  const currentPage = !isCover && !isEnd ? story.pages[storyPageIdx] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-6 flex items-center justify-between animate-fade-in">
          <Link to="/" className="font-display text-lg text-foreground/80 hover:text-foreground">
            Adventure Club 🌙
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">
            Shared story
          </span>
        </header>

        <div
          key={page}
          className="relative overflow-hidden rounded-[32px] border border-hairline bg-paper text-ink animate-fade-in card-glow"
        >
          {isCover ? (
            <div className="p-2">
              <StoryCover
                emoji={story.cover_emoji}
                gradient={story.cover_gradient}
                coverPath={story.cover_url}
                className="aspect-[4/5]"
                size="xl"
              />
              <div className="px-8 py-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">
                  An adventure starring {story.child_first_name}
                </p>
                <h1 className="mt-3 font-display text-4xl md:text-5xl text-ink text-balance">
                  {story.title}
                </h1>
                <p className="mt-4 text-ink/60">
                  {story.length_minutes}-minute {story.mood.toLowerCase()} story · {story.lesson}
                </p>
              </div>
            </div>
          ) : isEnd ? (
            <div className="p-2">
              <div
                className={cn(
                  "aspect-[4/3] relative overflow-hidden rounded-3xl bg-gradient-to-br",
                  story.cover_gradient,
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(1_0_0/0.2),transparent_60%)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-8xl animate-float drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                    🌙
                  </span>
                </div>
              </div>
              <div className="px-8 py-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/45">
                  The End
                </p>
                <h2 className="mt-3 font-display text-4xl text-ink">
                  Sweet dreams, {story.child_first_name} 🌙
                </h2>
                <p className="mt-3 text-ink/60 max-w-md mx-auto">
                  Thanks for reading along.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <div className="aspect-[4/3] relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
                {currentPage?.image_url ? (
                  <img
                    src={currentPage.image_url}
                    alt={`Page ${page}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-5xl opacity-60">🎨</span>
                  </div>
                )}
              </div>
              <div className="px-8 py-10">
                <p className="font-display text-2xl md:text-3xl leading-relaxed text-ink text-balance">
                  {currentPage?.text}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-hairline bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground/80 disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
            {isCover ? "Cover" : isEnd ? "The End" : `Page ${page} of ${totalPages}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages + 1, p + 1))}
            disabled={isEnd}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-30"
          >
            Next →
          </button>
        </div>

        <footer className="mt-12 text-center animate-fade-in">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-5 py-2.5 text-sm text-foreground/70 hover:text-foreground"
          >
            Made with Adventure Club 🌙
          </a>
        </footer>
      </div>
    </div>
  );
}
