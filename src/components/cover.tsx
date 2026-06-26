import { cn } from "@/lib/utils";

/**
 * StoryCover — illustrated cover placeholder using gradients + emoji.
 * Replace with AI-generated illustrations later.
 */
export function StoryCover({
  emoji,
  gradient,
  className,
  size = "md",
}: {
  emoji: string;
  gradient: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-4xl",
    md: "text-6xl",
    lg: "text-8xl",
    xl: "text-[10rem]",
  };
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br",
        gradient,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(1_0_0/0.15),transparent_60%)]" />
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn("drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-float", sizes[size])}>
          {emoji}
        </span>
      </div>
      {/* sparkles */}
      <span className="absolute top-3 right-4 text-star/80 animate-twinkle">✦</span>
      <span className="absolute bottom-5 left-5 text-star/60 animate-twinkle" style={{ animationDelay: "1.2s" }}>✦</span>
    </div>
  );
}
