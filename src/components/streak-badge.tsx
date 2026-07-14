import { cn } from "@/lib/utils";

export function StreakBadge({
  count,
  className,
}: {
  count: number | null | undefined;
  className?: string;
}) {
  if (!count || count < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-peach/40 bg-peach/15 px-2.5 py-1 text-xs font-semibold text-peach",
        className,
      )}
      title={`${count} night reading streak`}
    >
      <span aria-hidden>🔥</span>
      <span>
        {count} night{count === 1 ? "" : "s"} streak
      </span>
    </span>
  );
}
