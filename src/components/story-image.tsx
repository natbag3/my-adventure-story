import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { generateStoryPageImage } from "@/lib/story-images.functions";

type Props = {
  storyId: string;
  pageIndex: number;
  initialPath: string | null | undefined;
  alt: string;
  className?: string;
};

const cache = new Map<string, string>();

export function StoryImage({ storyId, pageIndex, initialPath, alt, className }: Props) {
  const [path, setPath] = useState<string | null>(initialPath ?? null);
  const [url, setUrl] = useState<string | null>(() => (initialPath ? cache.get(initialPath) ?? null : null));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateFn = useServerFn(generateStoryPageImage);

  // Resolve signed URL when we have a path
  useEffect(() => {
    if (!path) return;
    const cached = cache.get(path);
    if (cached) { setUrl(cached); return; }
    let cancelled = false;
    supabase.storage.from("adventurer-photos").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (cancelled) return;
      if (data?.signedUrl) {
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      }
    });
    return () => { cancelled = true; };
  }, [path]);

  // Trigger generation if missing
  useEffect(() => {
    if (path || generating) return;
    setGenerating(true);
    setError(null);
    generateFn({ data: { storyId, pageIndex } })
      .then((r) => setPath(r.imagePath))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not draw this page."))
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, pageIndex]);

  if (url) {
    return <img src={url} alt={alt} className={cn("object-cover", className)} />;
  }

  return (
    <div className={cn("grid place-items-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40", className)}>
      <div className="text-center">
        <span className="block text-5xl animate-float">🎨</span>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/70">
          {error ? "Tap retry below" : "Painting this page…"}
        </p>
        {error && (
          <button
            onClick={() => {
              setError(null);
              setGenerating(true);
              generateFn({ data: { storyId, pageIndex } })
                .then((r) => setPath(r.imagePath))
                .catch((e) => setError(e instanceof Error ? e.message : "Could not draw this page."))
                .finally(() => setGenerating(false));
            }}
            className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
