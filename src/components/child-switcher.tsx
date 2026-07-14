import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useActiveChild } from "@/lib/active-child-context";
import { CharacterAvatar } from "@/components/character-avatar";
import { cn } from "@/lib/utils";

export function ChildSwitcher({ className }: { className?: string }) {
  const { children, activeChild, setActiveChildId } = useActiveChild();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!activeChild) return null;

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2.5 rounded-full border border-hairline bg-surface/70 px-3 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-foreground/30"
      >
        <span className="overflow-hidden grid size-7 place-items-center rounded-full bg-mint/15 ring-1 ring-mint/30 text-xs">
          <CharacterAvatar
            portraitPath={activeChild.portrait_url}
            alt={activeChild.first_name}
            className="size-full"
          />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/45">
          Currently Exploring
        </span>
        <span className="font-display text-base">{activeChild.first_name}</span>
        <span className="text-foreground/40">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-hairline bg-background/95 p-2 shadow-2xl backdrop-blur-xl">
          {children.map((c) => {
            const active = c.id === activeChild.id;
            return (
              <button
                key={c.id}
                onClick={async () => {
                  await setActiveChildId(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  active ? "bg-foreground/10" : "hover:bg-foreground/5",
                )}
              >
                <span className="overflow-hidden grid size-9 place-items-center rounded-full bg-surface text-base">
                  <CharacterAvatar
                    portraitPath={c.portrait_url}
                    alt={c.first_name}
                    className="size-full"
                  />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {c.first_name}
                  </span>
                  {c.nickname && (
                    <span className="block text-[11px] text-foreground/50">
                      aka {c.nickname}
                    </span>
                  )}
                </span>
                {active && <span className="text-star text-xs">●</span>}
              </button>
            );
          })}
          <Link
            to="/onboarding"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-xl border border-dashed border-hairline px-3 py-2 text-sm text-foreground/60 hover:text-foreground hover:border-foreground/40"
          >
            <span className="grid size-9 place-items-center rounded-full bg-surface text-lg">
              ➕
            </span>
            Add New Adventurer
          </Link>
        </div>
      )}
    </div>
  );
}
