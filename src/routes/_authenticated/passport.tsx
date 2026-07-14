import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChildSwitcher } from "@/components/child-switcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveChild } from "@/lib/active-child-context";
import { WORLD_ZONES, zoneForTheme, type WorldZone } from "@/lib/worlds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/passport")({
  head: () => ({
    meta: [
      { title: "Adventure Map — Adventure Club" },
      {
        name: "description",
        content:
          "An illustrated world map that lights up as your adventurer explores new realms.",
      },
    ],
  }),
  component: PassportPage,
});

type StoryLite = {
  id: string;
  title: string;
  theme: string | null;
  cover_emoji: string | null;
  created_at: string;
};

function PassportPage() {
  const { user } = useAuth();
  const { activeChild } = useActiveChild();
  const [visited, setVisited] = useState<string[]>([]);
  const [stories, setStories] = useState<StoryLite[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeChild) {
      setVisited([]);
      setStories([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: childRow }, { data: storyRows }] = await Promise.all([
        supabase
          .from("children")
          .select("visited_worlds")
          .eq("id", activeChild.id)
          .maybeSingle(),
        supabase
          .from("stories")
          .select("id, title, theme, cover_emoji, created_at")
          .eq("user_id", user.id)
          .eq("child_id", activeChild.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setVisited((childRow?.visited_worlds as string[] | undefined) ?? []);
      setStories((storyRows as StoryLite[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeChild]);

  // Back-fill visited_worlds from historical stories so the map is populated
  // for adventurers who read stories before this feature existed.
  const derivedVisited = useMemo(() => {
    const set = new Set(visited);
    for (const s of stories) {
      const z = zoneForTheme(s.theme);
      if (z) set.add(z.id);
    }
    return set;
  }, [visited, stories]);

  const totalZones = WORLD_ZONES.length;
  const visitedCount = WORLD_ZONES.filter((z) => derivedVisited.has(z.id)).length;

  const selectedZone = selectedZoneId ? WORLD_ZONES.find((z) => z.id === selectedZoneId) ?? null : null;
  const selectedStories = selectedZone
    ? stories.filter((s) => zoneForTheme(s.theme)?.id === selectedZone.id)
    : [];

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">
            Adventure Map
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">
            {activeChild ? `${activeChild.first_name}'s World` : "Adventure Map"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Worlds visited:{" "}
            <span className="font-mono text-foreground">
              {visitedCount}/{totalZones}
            </span>
          </p>
        </div>
        <ChildSwitcher />
      </header>

      {!activeChild ? (
        <EmptyState />
      ) : (
        <>
          <WorldMap
            visited={derivedVisited}
            selectedId={selectedZoneId}
            onSelect={(id) => setSelectedZoneId(id)}
          />

          <div className="mt-8">
            {selectedZone ? (
              <ZoneDetail
                zone={selectedZone}
                visited={derivedVisited.has(selectedZone.id)}
                stories={selectedStories}
                onClose={() => setSelectedZoneId(null)}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {loading
                  ? "Loading your map…"
                  : visitedCount === 0
                  ? "No worlds explored yet — create your first story to light one up."
                  : "Tap a glowing zone to see the stories set there."}
              </p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function WorldMap({
  visited,
  selectedId,
  onSelect,
}: {
  visited: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-hairline bg-surface-elevated/50 p-3 md:p-5 shadow-inner">
      <svg
        viewBox="0 0 100 60"
        className="w-full h-auto rounded-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.05), transparent 60%), linear-gradient(160deg, #0e1530 0%, #1a1f3f 100%)",
        }}
      >
        {/* subtle stars */}
        {Array.from({ length: 40 }).map((_, i) => {
          const cx = (i * 53) % 100;
          const cy = (i * 29) % 60;
          const r = (i % 3) * 0.08 + 0.15;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" opacity={0.35} />;
        })}

        {WORLD_ZONES.map((z) => {
          const isVisited = visited.has(z.id);
          const isSelected = z.id === selectedId;
          return (
            <g
              key={z.id}
              onClick={() => onSelect(z.id)}
              style={{ cursor: "pointer" }}
              className="transition-opacity"
            >
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx={2.5}
                fill={isVisited ? z.color : "#2a2f45"}
                opacity={isVisited ? 0.92 : 0.55}
                stroke={isSelected ? "#f5c451" : isVisited ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)"}
                strokeWidth={isSelected ? 0.6 : 0.25}
              />
              {isVisited ? (
                <>
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + z.h / 2 - 1}
                    fontSize={z.w > 22 ? 6 : 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {z.emoji}
                  </text>
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + z.h - 2}
                    fontSize={2.2}
                    textAnchor="middle"
                    fill="#ffffff"
                    style={{ fontWeight: 600 }}
                  >
                    {z.label}
                  </text>
                </>
              ) : (
                <text
                  x={z.x + z.w / 2}
                  y={z.y + z.h / 2 + 1.5}
                  fontSize={6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.35)"
                  style={{ fontWeight: 700 }}
                >
                  ?
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ZoneDetail({
  zone,
  visited,
  stories,
  onClose,
}: {
  zone: WorldZone;
  visited: boolean;
  stories: StoryLite[];
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface-elevated/60 p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">
            {visited ? "Explored" : "Locked"}
          </p>
          <h2 className="font-display text-2xl mt-1">
            <span className="mr-2">{zone.emoji}</span>
            {zone.label}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          Close ✕
        </button>
      </div>

      {!visited ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This realm is still hidden in the mist. Create a story here to unlock it.
        </p>
      ) : stories.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Marked visited — but no stories are tagged here yet.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {stories.map((s) => (
            <li key={s.id}>
              <Link
                to="/story/$id"
                params={{ id: s.id }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-hairline",
                  "bg-background/40 px-3 py-2 hover:bg-background/70 transition",
                )}
              >
                <span className="text-xl">{s.cover_emoji ?? "✨"}</span>
                <span className="flex-1 truncate text-sm">{s.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-hairline bg-surface-elevated/50 p-10 text-center">
      <p className="text-4xl mb-3">🗺️</p>
      <p className="font-display text-xl mb-2">No adventurer selected</p>
      <p className="text-sm text-muted-foreground">
        Pick an adventurer to see the worlds they've explored.
      </p>
    </div>
  );
}
