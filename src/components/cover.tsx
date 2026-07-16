import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const coverCache = new Map<string, string>();

/**
 * StoryCover — AI-generated cover illustration when `coverPath` is set,
 * otherwise falls back to a gradient + emoji placeholder.
 */
export function StoryCover({
  emoji,
  gradient,
  coverPath,
  className,
  size = "md",
  alt,
}: {
  emoji: string;
  gradient: string;
  coverPath?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  alt?: string;
}) {
  const sizes = {
    sm: "text-4xl",
    md: "text-6xl",
    lg: "text-8xl",
    xl: "text-[10rem]",
  };
  const [url, setUrl] = useState<string | null>(() =>
    coverPath ? coverCache.get(coverPath) ?? null : null,
  );

  useEffect(() => {
    if (!coverPath) {
      setUrl(null);
      return;
    }
    const cached = coverCache.get(coverPath);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("adventurer-photos")
      .createSignedUrl(coverPath, 60 * 60)
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.signedUrl) {
          coverCache.set(coverPath, data.signedUrl);
          setUrl(data.signedUrl);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [coverPath]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br",
        gradient,
        className,
      )}
    >
      {url ? (
        <img src={url} alt={alt ?? "Story cover"} className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(1_0_0/0.15),transparent_60%)]" />
          <div className="absolute inset-0 grid place-items-center">
            <span className={cn("drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-float", sizes[size])}>
              {emoji}
            </span>
          </div>
          <span className="absolute top-3 right-4 text-star/80 animate-twinkle">✦</span>
          <span
            className="absolute bottom-5 left-5 text-star/60 animate-twinkle"
            style={{ animationDelay: "1.2s" }}
          >
            ✦
          </span>
        </>
      )}
    </div>
  );
}
