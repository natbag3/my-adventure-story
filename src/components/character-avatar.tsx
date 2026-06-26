import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import placeholder from "@/assets/character-placeholder.png";

type Props = {
  portraitPath: string | null | undefined;
  alt: string;
  className?: string;
  /** show a soft loading shimmer while signed URL is being fetched */
  loading?: boolean;
};

const cache = new Map<string, string>();

export function CharacterAvatar({ portraitPath, alt, className, loading }: Props) {
  const [url, setUrl] = useState<string | null>(() =>
    portraitPath ? cache.get(portraitPath) ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!portraitPath) {
      setUrl(null);
      return;
    }
    const cached = cache.get(portraitPath);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("adventurer-photos")
      .createSignedUrl(portraitPath, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setFailed(true);
          return;
        }
        cache.set(portraitPath, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [portraitPath]);

  const src = url && !failed ? url : placeholder;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn(
        "object-cover bg-surface-elevated",
        loading && "animate-pulse",
        className,
      )}
    />
  );
}
