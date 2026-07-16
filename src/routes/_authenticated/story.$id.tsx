import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { StoryCover } from "@/components/cover";
import { StoryImage } from "@/components/story-image";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateStoryPageImage } from "@/lib/story-images.functions";
import { generateStoryPageAudio } from "@/lib/story-audio.functions";
import { bumpReadingStreak } from "@/lib/streak";
import { useActiveChild } from "@/lib/active-child-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type StoryPage = { text: string; illustration_prompt?: string; image_url?: string | null; audio_url?: string | null };
type StoryRow = {
  id: string;
  title: string;
  theme: string;
  mood: string;
  lesson: string;
  length_minutes: number;
  cover_emoji: string;
  cover_url: string | null;
  cover_gradient: string;
  pages: StoryPage[];
  favorite: boolean;
  child_id: string;
  share_token: string;
};

export const Route = createFileRoute("/_authenticated/story/$id")({
  head: () => ({
    meta: [
      { title: "Your Adventure — Adventure Club" },
      { name: "description", content: "A magical bedtime adventure from Adventure Club." },
    ],
  }),
  component: StoryReader,
});

function StoryReader() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const generateImageFn = useServerFn(generateStoryPageImage);
  const generateAudioFn = useServerFn(generateStoryPageAudio);
  const { refresh: refreshChildren } = useActiveChild();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryRow | null>(null);
  const [childName, setChildName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [finishingImages, setFinishingImages] = useState(false);
  const [imageFailures, setImageFailures] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingAudioIdx, setLoadingAudioIdx] = useState<number | null>(null);
  const audioCacheRef = useRef<Map<number, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsPremium(!!(data as { is_premium?: boolean } | null)?.is_premium);
      });
  }, [user]);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stories")
        .select("id, title, theme, mood, lesson, length_minutes, cover_emoji, cover_gradient, cover_url, pages, favorite, child_id, share_token")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = data as unknown as StoryRow;
      setStory(row);
      setFavorite(row.favorite);
      // Bump reading streak when a story is opened
      void bumpReadingStreak(row.child_id).then(() => refreshChildren());
      const { data: child } = await supabase
        .from("children")
        .select("first_name")
        .eq("id", row.child_id)
        .maybeSingle();
      if (!cancelled) setChildName(child?.first_name ?? "");

      // Backfill any missing page illustrations before the user starts reading.
      const missing = row.pages
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !p.image_url);
      if (missing.length > 0) {
        if (!cancelled) setFinishingImages(true);
        const results = await Promise.all(
          missing.map(({ i }) =>
            generateImageFn({ data: { storyId: row.id, pageIndex: i } }).catch((e) => {
              console.error("Image failed", e);
              return null;
            }),
          ),
        );
        const failed = results.filter((r) => r === null).length;
        // Refetch the row so updated image_url values are reflected.
        const { data: refreshed } = await supabase
          .from("stories")
          .select("id, title, theme, mood, lesson, length_minutes, cover_emoji, cover_gradient, cover_url, pages, favorite, child_id, share_token")
          .eq("id", id)
          .maybeSingle();
        if (!cancelled) {
          if (refreshed) setStory(refreshed as unknown as StoryRow);
          setImageFailures(failed);
          setFinishingImages(false);
        }
      } else {
        try {
          const cached = sessionStorage.getItem(`story-img-failed-${row.id}`);
          if (cached && !cancelled) setImageFailures(Number(cached) || 0);
        } catch {
          /* ignore */
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleFavorite() {
    if (!story) return;
    const next = !favorite;
    setFavorite(next);
    await supabase.from("stories").update({ favorite: next }).eq("id", story.id);
  }

  async function shareStory() {
    if (!story) return;
    const url = `${window.location.origin}/share/${story.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!", { description: "Share it with anyone." });
    } catch {
      toast.error("Couldn't copy link", { description: url });
    }
  }


  async function ensureAudioUrl(pageIdx: number): Promise<string> {
    const cached = audioCacheRef.current.get(pageIdx);
    if (cached) return cached;
    const res = await generateAudioFn({ data: { storyId: id, pageIndex: pageIdx } });
    audioCacheRef.current.set(pageIdx, res.audioUrl);
    return res.audioUrl;
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingIdx(null);
  }

  async function togglePlay(pageIdx: number) {
    if (playingIdx === pageIdx) {
      stopPlayback();
      return;
    }
    stopPlayback();
    setLoadingAudioIdx(pageIdx);
    try {
      const url = await ensureAudioUrl(pageIdx);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setPlayingIdx(null);
        }
      };
      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setPlayingIdx(null);
        }
        toast.error("Couldn't play narration");
      };
      await audio.play();
      setPlayingIdx(pageIdx);
      // Prefetch next page's audio in the background
      if (story) {
        const nextIdx = pageIdx + 1;
        if (nextIdx < story.pages.length && !audioCacheRef.current.has(nextIdx)) {
          void ensureAudioUrl(nextIdx).catch(() => {});
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Narration failed");
    } finally {
      setLoadingAudioIdx(null);
    }
  }

  useEffect(() => {
    return () => stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop audio when navigating pages
  useEffect(() => {
    stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);


  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center py-24 text-center">
          <span className="text-5xl animate-float">{finishingImages ? "🎨" : "🌙"}</span>
          <p className="mt-4 font-display text-xl text-foreground/70">
            {finishingImages ? "Finishing illustrations…" : "Opening your storybook…"}
          </p>
        </div>
      </AppShell>
    );
  }

  if (notFound || !story) {
    return (
      <AppShell>
        <div className="grid place-items-center py-24 text-center">
          <h1 className="font-display text-3xl text-foreground">Story not found</h1>
          <Link to="/library" className="mt-4 text-lavender">← Back to library</Link>
        </div>
      </AppShell>
    );
  }

  // Pages layout: 0 = cover, 1..N = story pages, N+1 = End screen
  const totalPages = story.pages.length;
  const isCover = page === 0;
  const isEnd = page === totalPages + 1;
  const storyPageIdx = page - 1; // 0-based index into pages[]
  const currentPage = !isCover && !isEnd ? story.pages[storyPageIdx] : null;




  const progress = Math.min(1, Math.max(0, page / (totalPages + 1)));

  return (
    <AppShell>
      <div
        aria-hidden
        className="fixed left-0 right-0 top-16 z-30 h-[3px] bg-background/60"
      >
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mb-6 flex items-center justify-between animate-fade-in">
        <Link to="/library" className="text-xs text-foreground/55 hover:text-foreground">← Library</Link>
        <div className="flex items-center gap-2">
          <IconBtn label="Share" onClick={shareStory}>🔗</IconBtn>
          <IconBtn label="Favorite" onClick={toggleFavorite} active={favorite}>★</IconBtn>
        </div>
      </div>

      {imageFailures > 0 && (
        <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-peach/40 bg-peach/10 px-4 py-3 text-sm text-foreground/80 animate-fade-in">
          ✨ {imageFailures} illustration{imageFailures === 1 ? "" : "s"} couldn't be drawn this time. The story is still ready to read — tap a page to retry its artwork.
        </div>
      )}

      <div className="relative mx-auto max-w-3xl">
        <div
          key={page}
          className="overflow-hidden rounded-[32px] border border-hairline bg-paper text-ink animate-fade-in card-glow"
        >
          {isCover ? (
            <div className="p-2">
              <StoryCover emoji={story.cover_emoji} gradient={story.cover_gradient} coverPath={story.cover_url} className="aspect-[4/5]" size="xl" />
              <div className="px-8 py-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">
                  An adventure starring {childName}
                </p>
                <h1 className="mt-3 font-display text-4xl md:text-5xl text-ink text-balance">{story.title}</h1>
                <p className="mt-4 text-ink/60">
                  {story.length_minutes}-minute {story.mood.toLowerCase()} story · {story.lesson}
                </p>
              </div>
            </div>
          ) : isEnd ? (
            <div className="p-2">
              <div className={cn("aspect-[4/3] relative overflow-hidden rounded-3xl bg-gradient-to-br", story.cover_gradient)}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(1_0_0/0.2),transparent_60%)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-8xl animate-float drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">🌙</span>
                </div>
              </div>
              <div className="px-8 py-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/45">The End</p>
                <h2 className="mt-3 font-display text-4xl text-ink">Sweet dreams, {childName} 🌙</h2>
                <p className="mt-3 text-ink/60 max-w-md mx-auto">
                  Your adventure is safely saved in the Story Library. Ready for another tale?
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => navigate({ to: "/create" })}
                    className="rounded-full bg-primary px-8 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.85_0.16_88/0.6)] hover:scale-[1.02] transition-transform"
                  >
                    ✨ Create Another Adventure
                  </button>
                  <button
                    onClick={() => navigate({ to: "/" })}
                    className="rounded-full border border-ink/15 bg-paper px-6 py-4 font-medium text-ink/70 hover:text-ink"
                  >
                    🏠 Back to Home
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[520px] p-2">
              <div className="relative overflow-hidden rounded-3xl basis-[55%] shrink-0">
                <StoryImage
                  storyId={story.id}
                  pageIndex={storyPageIdx}
                  initialPath={currentPage?.image_url ?? null}
                  alt={currentPage?.illustration_prompt ?? `Page ${page}`}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-6 md:py-8">
                <div className="mb-4 flex justify-end">
                  <NarrationButton
                    isPremium={isPremium}
                    isPlaying={playingIdx === storyPageIdx}
                    isLoading={loadingAudioIdx === storyPageIdx}
                    onClick={() => togglePlay(storyPageIdx)}
                  />
                </div>
                <p className="font-display text-xl md:text-2xl leading-relaxed text-ink text-balance">
                  {currentPage?.text}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          {page > 0 ? (
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-full border border-hairline bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground/80"
            >
              ← Previous
            </button>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
            {isCover ? "Cover" : isEnd ? "The End" : `Page ${page} of ${totalPages}`}
          </span>
          {!isEnd ? (
            <button
              onClick={() => setPage((p) => Math.min(totalPages + 1, p + 1))}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => navigate({ to: "/create" })}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              New Adventure ✨
            </button>
          )}
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

function NarrationButton({
  isPremium,
  isPlaying,
  isLoading,
  onClick,
}: {
  isPremium: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  if (!isPremium) {
    return (
      <button
        type="button"
        title="Upgrade to hear your story narrated ✨"
        aria-label="Upgrade to hear your story narrated"
        onClick={() => toast("Upgrade to hear your story narrated ✨")}
        className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/5 px-4 py-2 text-sm font-medium text-ink/40 cursor-not-allowed"
      >
        <span className="text-lg">🔊</span>
        <span>Narrate</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label={isPlaying ? "Pause narration" : "Play narration"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        isPlaying
          ? "border-star/60 bg-star/15 text-star"
          : "border-ink/15 bg-paper text-ink hover:bg-ink/5",
        isLoading && "opacity-70",
      )}
    >
      <span className="text-lg">{isLoading ? "⏳" : isPlaying ? "⏸️" : "🔊"}</span>
      <span>{isLoading ? "Loading…" : isPlaying ? "Pause" : "Listen"}</span>
    </button>
  );
}
