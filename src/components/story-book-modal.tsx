import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { generateStoryBookPdf } from "@/lib/story-book.functions";

export type StoryBookStory = {
  id: string;
  title: string;
  cover_emoji: string;
  favorite: boolean;
  created_at: string;
  child_id: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  stories: StoryBookStory[];
};

export function StoryBookModal({
  open,
  onOpenChange,
  childId,
  childName,
  stories,
}: Props) {
  const generate = useServerFn(generateStoryBookPdf);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const s of stories) set.add(new Date(s.created_at).getFullYear());
    const years = Array.from(set).sort((a, b) => b - a);
    if (years.length === 0) years.push(new Date().getFullYear());
    return years;
  }, [stories]);

  const [year, setYear] = useState<number>(availableYears[0]);
  const yearStories = useMemo(
    () =>
      stories
        .filter((s) => new Date(s.created_at).getFullYear() === year)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [stories, year],
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    // Default: all favourites in the current year
    return new Set(yearStories.filter((s) => s.favorite).map((s) => s.id));
  });
  const [busy, setBusy] = useState(false);

  // Re-seed defaults when year changes
  const onYearChange = (nextYear: number) => {
    setYear(nextYear);
    const yr = stories.filter(
      (s) => new Date(s.created_at).getFullYear() === nextYear,
    );
    const favs = yr.filter((s) => s.favorite);
    setSelected(new Set((favs.length > 0 ? favs : yr).map((s) => s.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelected(new Set(yearStories.map((s) => s.id)));
  const selectFavs = () =>
    setSelected(
      new Set(yearStories.filter((s) => s.favorite).map((s) => s.id)),
    );

  const handleCreate = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one story");
      return;
    }
    setBusy(true);
    try {
      const res = await generate({
        data: {
          childId,
          year,
          storyIds: Array.from(selected),
        },
      });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Story book ready \u2728");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            📚 {childName}'s Adventure Book
          </DialogTitle>
          <DialogDescription>
            Pick a year and the stories to include. We'll bind them into a
            printable PDF keepsake.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Year
            </div>
            <div className="flex gap-2 flex-wrap">
              {availableYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => onYearChange(y)}
                  className={
                    "px-4 py-1.5 rounded-full text-sm border transition-colors " +
                    (y === year
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50")
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Stories ({selected.size}/{yearStories.length} selected)
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={selectFavs}
                >
                  Favourites
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={selectAll}
                >
                  All
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {yearStories.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No stories written in {year} yet.
                </div>
              ) : (
                yearStories.map((s) => {
                  const checked = selected.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(s.id)}
                      />
                      <span className="text-lg" aria-hidden>
                        {s.cover_emoji || "📖"}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm">
                        {s.title}
                      </span>
                      {s.favorite && (
                        <span
                          className="text-amber-500 text-sm"
                          aria-label="Favourite"
                        >
                          ★
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(s.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic text-center">
            Want a printed copy? Coming soon 📖
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={busy || selected.size === 0}>
            {busy ? "Binding the book…" : "Create PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
