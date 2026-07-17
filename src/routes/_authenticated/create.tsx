import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CharacterAvatar } from "@/components/character-avatar";
import { ADVENTURES, MOODS, LESSONS, LENGTHS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useActiveChild } from "@/lib/active-child-context";
import { generateStory } from "@/lib/stories.functions";
import { generateStoryPageImage, generateStoryCoverImage } from "@/lib/story-images.functions";
import { getSubscriptionState, type SubscriptionState } from "@/lib/subscription.functions";
import { PricingModal } from "@/components/pricing-modal";
import { track } from "@/lib/analytics";

function calcAge(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

// Anonymous Gregorian algorithm for Easter Sunday
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((da - db) / ms);
}

type SeasonalOption = {
  id: string;
  emoji: string;
  label: string;
  theme: string; // sent to the story generator
  active: boolean;
  unlockLabel: string;
};

function getSeasonalOptions(dobIso: string | null | undefined, now: Date = new Date()): SeasonalOption[] {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const day = now.getDate();

  // Halloween — all of October
  const halloweenActive = month === 9;
  const halloweenUnlock = halloweenActive
    ? "Active all October"
    : `Unlocks Oct 1${month > 9 ? `, ${year + 1}` : ""}`;

  // Christmas — Dec 1–26
  const christmasActive = month === 11 && day >= 1 && day <= 26;
  const christmasUnlock = christmasActive
    ? "Active through Dec 26"
    : `Unlocks Dec 1${month === 11 && day > 26 ? `, ${year + 1}` : ""}`;

  // Easter — week of Easter Sunday (Sunday..Saturday around it, ±3 days)
  const easter = easterSunday(year);
  const easterDelta = daysBetween(now, easter);
  const easterActive = Math.abs(easterDelta) <= 3;
  const nextEaster = easterDelta < -3 ? easterSunday(year + 1) : easter;
  const easterUnlock = easterActive
    ? "Easter week!"
    : `Unlocks ${nextEaster.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  // Birthday — 5 days before through birthday itself (inclusive)
  let birthdayActive = false;
  let birthdayUnlock = "Add a birthday to unlock";
  if (dobIso) {
    const dob = new Date(dobIso);
    if (!isNaN(dob.getTime())) {
      const thisYear = new Date(year, dob.getMonth(), dob.getDate());
      let nextBirthday = thisYear;
      // If this year's birthday is already more than 0 days past, roll to next year
      if (daysBetween(thisYear, now) < 0) {
        nextBirthday = new Date(year + 1, dob.getMonth(), dob.getDate());
      }
      const delta = daysBetween(nextBirthday, now); // positive = days until birthday
      birthdayActive = delta >= 0 && delta <= 5;
      birthdayUnlock = birthdayActive
        ? delta === 0 ? "Happy birthday!" : "Birthday soon!"
        : `Unlocks ${nextBirthday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
  }

  return [
    {
      id: "seasonal-halloween",
      emoji: "🎃",
      label: "Halloween",
      theme: "A friendly, not-too-spooky Halloween adventure",
      active: halloweenActive,
      unlockLabel: halloweenUnlock,
    },
    {
      id: "seasonal-christmas",
      emoji: "🎄",
      label: "Christmas",
      theme: "A cozy Christmas Eve adventure with snow and wonder",
      active: christmasActive,
      unlockLabel: christmasUnlock,
    },
    {
      id: "seasonal-easter",
      emoji: "🐣",
      label: "Easter",
      theme: "A springtime Easter adventure with hidden treasures",
      active: easterActive,
      unlockLabel: easterUnlock,
    },
    {
      id: "seasonal-birthday",
      emoji: "🎂",
      label: "Birthday",
      theme: "A birthday adventure full of surprises made just for them",
      active: birthdayActive,
      unlockLabel: birthdayUnlock,
    },
  ];
}


export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create Tonight's Adventure — Adventure Club" },
      { name: "description", content: "Build a one-of-a-kind bedtime story in a few magical taps." },
    ],
  }),
  component: CreateWizard,
});

const STEPS = ["Stars", "World", "Mood", "Lesson", "Length", "Generate"] as const;

type PetRow = {
  id: string;
  name: string;
  type: "cat" | "dog";
  fur_color: string | null;
  eye_color: string | null;
};

function CreateWizard() {
  const navigate = useNavigate();
  const { children, activeChild } = useActiveChild();

  const [step, setStep] = useState(0);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [mode, setMode] = useState<"solo" | "multi">("solo");
  const [coStarIds, setCoStarIds] = useState<string[]>([]);
  const [petIds, setPetIds] = useState<string[]>([]);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [adventure, setAdventure] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>("bedtime");
  const [lesson, setLesson] = useState<string | null>(null);
  const [length, setLength] = useState<3 | 5 | 10>(5);
  const [generating, setGenerating] = useState(false);
  const [prepTotal, setPrepTotal] = useState(0);
  const [prepDone, setPrepDone] = useState(0);
  const [prepStage, setPrepStage] = useState<"writing" | "painting" | "binding">("writing");
  const [error, setError] = useState<string | null>(null);
  // Series state
  const [seriesMode, setSeriesMode] = useState<"oneoff" | "continue" | "new">("oneoff");
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesWorld, setNewSeriesWorld] = useState("");
  const [newSeriesTotalParts, setNewSeriesTotalParts] = useState(5);
  const [activeSeries, setActiveSeries] = useState<
    Array<{ id: string; title: string; total_parts: number; current_part: number; child_id: string }>
  >([]);
  const generateFn = useServerFn(generateStory);
  const generateImageFn = useServerFn(generateStoryPageImage);
  const generateCoverFn = useServerFn(generateStoryCoverImage);
  const fetchSubscription = useServerFn(getSubscriptionState);
  const [limitOpen, setLimitOpen] = useState(false);
  const [subState, setSubState] = useState<SubscriptionState | null>(null);

  // Fetch the user's pets once.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("pets")
      .select("id, name, type, fur_color, eye_color")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setPets((data ?? []) as PetRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Default the primary star to the currently active adventurer.
  useEffect(() => {
    if (!primaryId && activeChild) setPrimaryId(activeChild.id);
  }, [activeChild, primaryId]);

  // Single child? Skip the Stars step.
  useEffect(() => {
    if (children.length === 1 && step === 0) setStep(1);
  }, [children.length, step]);

  // Load active (unfinished) series for the currently selected child
  useEffect(() => {
    if (!primaryId) {
      setActiveSeries([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("story_series")
      .select("id, title, total_parts, current_part, child_id")
      .eq("child_id", primaryId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as Array<{
          id: string;
          title: string;
          total_parts: number;
          current_part: number;
          child_id: string;
        }>;
        setActiveSeries(rows.filter((s) => s.current_part <= s.total_parts));
      });
    return () => {
      cancelled = true;
    };
  }, [primaryId]);

  const selectedChild = children.find((c) => c.id === primaryId);
  const seasonalOptions = getSeasonalOptions(selectedChild?.date_of_birth).filter((s) => s.active);

  const canNext =
    (step === 0 && !!primaryId) ||
    (step === 1 && !!adventure) ||
    (step === 2 && !!mood) ||
    (step === 3 && !!lesson) ||
    step === 4 ||
    step === 5;

  function toggleCoStar(id: string) {
    setCoStarIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function handleGenerate() {
    if (!primaryId || !adventure || !lesson || !mood) return;

    // Pre-check subscription limit before spending time generating.
    try {
      const state = await fetchSubscription();
      setSubState(state);
      if (state.atLimit) {
        setLimitOpen(true);
        return;
      }
    } catch (e) {
      console.error("Could not verify subscription state", e);
      // fall through — server-side check will still enforce
    }

    setGenerating(true);
    setError(null);
    setPrepStage("writing");
    setPrepDone(0);
    setPrepTotal(0);
    try {
      const adventureLabel = ADVENTURES.find((a) => a.id === adventure)?.label ?? adventure;
      const moodLabel = MOODS.find((m) => m.id === mood)?.label ?? mood;
      const lessonLabel = LESSONS.find((l) => l.id === lesson)?.label ?? lesson;
      const result = await generateFn({
        data: {
          childId: primaryId,
          coStarIds: mode === "multi" ? coStarIds.filter((id) => id !== primaryId) : [],
          theme: adventureLabel,
          mood: moodLabel,
          lesson: lessonLabel,
          lengthMinutes: length,
          petIds,
          seriesId: seriesMode === "continue" ? seriesId : null,
          newSeries:
            seriesMode === "new" && newSeriesTitle.trim() && newSeriesWorld.trim()
              ? {
                  title: newSeriesTitle.trim(),
                  worldDescription: newSeriesWorld.trim(),
                  totalParts: newSeriesTotalParts,
                }
              : null,
        },
      });

      setPrepStage("painting");
      const { data: story } = await supabase
        .from("stories")
        .select("pages")
        .eq("id", result.storyId)
        .single();
      const pages = (story?.pages as Array<{ image_url?: string | null }> | null) ?? [];
      const missing = pages
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !p.image_url);
      setPrepTotal(pages.length);
      setPrepDone(pages.length - missing.length);

      // Kick off the cover illustration in parallel with page illustrations.
      const coverPromise = generateCoverFn({ data: { storyId: result.storyId } }).catch((e) => {
        console.error("Cover failed", e);
        return null;
      });

      const results: Array<unknown | null> = [];
      for (const { i } of missing) {
        try {
          const r = await generateImageFn({ data: { storyId: result.storyId, pageIndex: i } });
          results.push(r);
        } catch (e) {
          console.error("Image failed", e);
          results.push(null);
        } finally {
          setPrepDone((d) => d + 1);
        }
      }
      const failedCount = results.filter((r) => r === null).length;
      if (failedCount > 0) {
        try {
          sessionStorage.setItem(`story-img-failed-${result.storyId}`, String(failedCount));
        } catch {
          /* ignore */
        }
      }

      setPrepStage("binding");
      await coverPromise;
      await new Promise((r) => setTimeout(r, 600));
      navigate({ to: "/story/$id", params: { id: result.storyId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <AppShell>
        <StoryPreparation
          total={prepTotal}
          done={prepDone}
          stage={prepStage}
          childName={selectedChild?.first_name ?? "your adventurer"}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <Link to="/" className="text-xs text-foreground/55 hover:text-foreground">← Home</Link>
        <h1 className="mt-2 font-display text-4xl text-foreground">Create Tonight's Adventure</h1>
        <p className="mt-1 text-foreground/55">A few small choices. One magical story.</p>
      </header>

      {/* Stepper */}
      <div className="mb-10 flex flex-wrap items-center gap-2 animate-slide-up [animation-delay:100ms]">
        {STEPS.map((label, i) => {
          // Hide first "Stars" pill when there is only one child.
          if (i === 0 && children.length <= 1) return null;
          return (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  i === step
                    ? "border-star/60 bg-star/15 text-star"
                    : i < step
                    ? "border-mint/40 bg-mint/10 text-mint"
                    : "border-hairline bg-surface/40 text-foreground/40",
                )}
              >
                <span className="grid size-5 place-items-center rounded-full bg-foreground/10 text-[10px]">
                  {i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-foreground/20">·</span>}
            </div>
          );
        })}
      </div>

      <div className="rounded-[32px] border border-hairline bg-surface/60 p-8 min-h-[420px] animate-slide-up [animation-delay:200ms]">
        {step === 0 && (
          <StepWrap title="Who stars in tonight's story?">
            <div className="mb-6 flex flex-wrap gap-2">
              {(["solo", "multi"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === "solo") setCoStarIds([]);
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium",
                    mode === m
                      ? "border-star/60 bg-star/15 text-foreground"
                      : "border-hairline bg-surface-elevated text-foreground/70",
                  )}
                >
                  {m === "solo" ? "Just this child" : "Multiple children"}
                </button>
              ))}
            </div>

            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">
              Tonight's hero
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {children.map((c) => {
                const age = calcAge(c.date_of_birth);
                const isPrimary = primaryId === c.id;
                const isCoStar = coStarIds.includes(c.id) && c.id !== primaryId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (mode === "solo") {
                        setPrimaryId(c.id);
                        setCoStarIds([]);
                      } else if (isPrimary) {
                        // primary tap is no-op; pick a different primary by selecting elsewhere
                      } else if (isCoStar) {
                        toggleCoStar(c.id);
                      } else {
                        toggleCoStar(c.id);
                      }
                    }}
                    onDoubleClick={() => setPrimaryId(c.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-3 rounded-3xl border p-6 transition-all",
                      isPrimary
                        ? "border-star/60 bg-star/10"
                        : isCoStar
                        ? "border-lavender/50 bg-lavender/10"
                        : "border-hairline bg-surface-elevated hover:border-foreground/30",
                    )}
                  >
                    <span className="overflow-hidden size-20 rounded-full bg-paper shadow-lg ring-2 ring-paper/60">
                      <CharacterAvatar portraitPath={c.portrait_url} alt={c.first_name} className="size-full" />
                    </span>
                    <span className="font-display text-lg text-foreground">
                      {c.first_name}
                    </span>
                    {age != null && <span className="text-xs text-foreground/55">Age {age}</span>}
                    {isPrimary && (
                      <span className="absolute top-3 right-3 rounded-full bg-star/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-star">
                        ★ Hero
                      </span>
                    )}
                    {isCoStar && (
                      <span className="absolute top-3 right-3 rounded-full bg-lavender/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-lavender">
                        Co-star
                      </span>
                    )}
                    {mode === "multi" && !isPrimary && !isCoStar && (
                      <span className="absolute top-3 right-3 text-foreground/30 text-xs">+ add</span>
                    )}
                  </button>
                );
              })}
              <Link
                to="/onboarding"
                className="grid place-items-center rounded-3xl border-2 border-dashed border-hairline text-foreground/55 hover:text-foreground p-6"
              >
                + Add adventurer
              </Link>
            </div>
            {mode === "multi" && (
              <p className="mt-4 text-xs text-foreground/50">
                Tap a card to add a co-star. Double-tap to make them the main hero.
              </p>
            )}

            <div className="mt-10">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-foreground/45">
                Add a pet sidekick
              </p>
              <p className="mb-3 text-xs text-foreground/50">
                Pets can join as sidekicks but never as the main hero.
              </p>
              {pets.length === 0 ? (
                <Link
                  to="/adventurers/new-pet"
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-hairline px-4 py-2 text-sm text-foreground/65 hover:text-foreground"
                >
                  🐾 Add your first pet
                </Link>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pets.map((p) => {
                    const selected = petIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setPetIds((cur) =>
                            cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                          selected
                            ? "border-mint/60 bg-mint/10"
                            : "border-hairline bg-surface-elevated hover:border-foreground/30",
                        )}
                      >
                        <span className="grid size-12 place-items-center rounded-full bg-paper text-2xl shadow-sm">
                          {p.type === "cat" ? "🐱" : "🐶"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-base text-foreground truncate">{p.name}</p>
                          <p className="text-[11px] text-foreground/55 flex items-center gap-1.5">
                            {p.fur_color && (
                              <>
                                <span className="size-2.5 rounded-full bg-foreground/20" />
                                {p.fur_color}
                              </>
                            )}
                          </p>
                        </div>
                        {selected && (
                          <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-mint">
                            Sidekick
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </StepWrap>
        )}

        {step === 1 && (
          <StepWrap title="Where shall we go?">
            {/* Series toggle */}
            <div className="mb-8 rounded-2xl border border-hairline bg-surface-elevated/50 p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">
                Story series
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "oneoff", label: "One-off story" },
                  { id: "continue", label: "Continue a series", disabled: activeSeries.length === 0 },
                  { id: "new", label: "Start a new series" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    disabled={"disabled" in opt ? opt.disabled : false}
                    onClick={() => {
                      setSeriesMode(opt.id);
                      if (opt.id !== "continue") setSeriesId(null);
                    }}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      seriesMode === opt.id
                        ? "border-lavender/60 bg-lavender/15 text-foreground"
                        : "border-hairline bg-surface text-foreground/70 hover:border-foreground/30",
                      "disabled" in opt && opt.disabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {seriesMode === "continue" && activeSeries.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {activeSeries.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeriesId(s.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                        seriesId === s.id
                          ? "border-lavender/70 bg-lavender/10"
                          : "border-hairline bg-surface hover:border-foreground/30",
                      )}
                    >
                      <span className="font-display text-base text-foreground">📖 {s.title}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                        Next: Part {Math.min(s.current_part, s.total_parts)} of {s.total_parts}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {seriesMode === "new" && (
                <div className="mt-4 space-y-3">
                  <input
                    value={newSeriesTitle}
                    onChange={(e) => setNewSeriesTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Series title (e.g. The Dragon Chronicles)"
                    className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-lavender/60"
                  />
                  <textarea
                    value={newSeriesWorld}
                    onChange={(e) => setNewSeriesWorld(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe the world: kingdom, characters, magic, tone… (this stays consistent across parts)"
                    className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-lavender/60"
                  />
                  <div className="flex items-center gap-3">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                      Total parts
                    </label>
                    <div className="flex gap-1">
                      {[3, 5, 7, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setNewSeriesTotalParts(n)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium",
                            newSeriesTotalParts === n
                              ? "border-lavender/60 bg-lavender/15 text-foreground"
                              : "border-hairline bg-surface text-foreground/60",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {seasonalOptions.length > 0 && (
              <div className="mb-8">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-star/80">
                  ✨ Special
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {seasonalOptions.map((s) => {
                    const selected = adventure === s.theme;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setAdventure(s.theme);
                          setStep(2);
                        }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all",
                          selected
                            ? "border-star bg-star/15 shadow-[0_0_0_2px_oklch(0.85_0.16_88/0.4),0_10px_30px_-10px_oklch(0.85_0.16_88/0.6)]"
                            : "border-star/60 bg-gradient-to-br from-star/10 to-peach/5 shadow-[0_0_0_1px_oklch(0.85_0.16_88/0.5),0_10px_30px_-15px_oklch(0.85_0.16_88/0.5)] hover:-translate-y-0.5",
                        )}
                      >
                        <span className="text-3xl">{s.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-star">
                          {s.unlockLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">
              All adventures
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ADVENTURES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAdventure(a.id);
                    setStep(2);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all hover:-translate-y-0.5",
                    adventure === a.id
                      ? "border-star/60 bg-star/10"
                      : "border-hairline bg-surface-elevated",
                  )}
                >
                  <span className="text-3xl">{a.emoji}</span>
                  <span className="text-sm text-foreground">{a.label}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )}

        {step === 2 && (
          <StepWrap title="What kind of story?">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMood(m.id);
                    setStep(3);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-5 text-left transition-all",
                    mood === m.id
                      ? "border-lavender/60 bg-lavender/10"
                      : "border-hairline bg-surface-elevated hover:border-foreground/30",
                  )}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="font-display text-lg text-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )}

        {step === 3 && (
          <StepWrap title="What should they learn?">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {LESSONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLesson(l.id);
                    setStep(4);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all hover:-translate-y-0.5",
                    lesson === l.id
                      ? "border-peach/60 bg-peach/10"
                      : "border-hairline bg-surface-elevated",
                  )}
                >
                  <span className="text-3xl">{l.emoji}</span>
                  <span className="text-sm text-foreground text-center">{l.label}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )}

        {step === 4 && (
          <StepWrap title="How long should it be?">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LENGTHS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLength(l.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-3xl border p-6 transition-all text-left",
                    length === l.id
                      ? "border-mint/60 bg-mint/10"
                      : "border-hairline bg-surface-elevated hover:border-foreground/30",
                  )}
                >
                  <span className="font-display text-3xl text-foreground">{l.label}</span>
                  <span className="text-sm text-foreground/55">{l.helper}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )}

        {step === 5 && (
          <StepWrap title="Ready when you are">
            <div className="text-center py-10">
              <div className="mx-auto mb-6 grid size-28 place-items-center rounded-full bg-gradient-to-br from-star to-peach text-5xl shadow-[0_0_40px_oklch(0.85_0.16_88/0.5)] animate-float">
                ✨
              </div>
              <p className="font-display text-2xl text-foreground mb-2">Everything looks magical.</p>
              <p className="text-foreground/55 mb-8">
                We'll craft a {length}-minute {MOODS.find((m) => m.id === mood)?.label.toLowerCase()} adventure for{" "}
                {selectedChild?.first_name ?? "your adventurer"}
                {mode === "multi" && coStarIds.filter((id) => id !== primaryId).length > 0 && (
                  <>
                    {" "}
                    with{" "}
                    {children
                      .filter((c) => coStarIds.includes(c.id) && c.id !== primaryId)
                      .map((c) => c.first_name)
                      .join(" & ")}
                  </>
                )}{" "}
                in the world of {ADVENTURES.find((a) => a.id === adventure)?.label ?? "wonder"}.
              </p>
              <button
                onClick={handleGenerate}
                disabled={!adventure || !lesson}
                className="rounded-full bg-primary px-8 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.85_0.16_88/0.6)] disabled:opacity-40 hover:scale-[1.02] transition-transform"
              >
                Generate Adventure ✨
              </button>
              {error && (
                <p className="mt-6 text-sm text-red-300/90 bg-red-500/10 border border-red-400/30 rounded-2xl px-4 py-3 max-w-md mx-auto">
                  {error}
                </p>
              )}
            </div>
          </StepWrap>
        )}
      </div>

      {/* Navigation */}
      {!generating && (
        <div className="mt-6 flex items-center justify-between animate-fade-in">
          <button
            onClick={() => setStep((s) => Math.max(children.length <= 1 ? 1 : 0, s - 1))}
            disabled={step === (children.length <= 1 ? 1 : 0)}
            className="rounded-full border border-hairline bg-surface/60 px-5 py-2.5 text-sm font-medium text-foreground/70 disabled:opacity-30"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full bg-foreground/10 px-6 py-2.5 text-sm font-semibold text-foreground disabled:opacity-30 hover:bg-foreground/15"
            >
              Next →
            </button>
          )}
        </div>
      )}
      <PricingModal
        open={limitOpen}
        onOpenChange={setLimitOpen}
        title="You've used all your stories ✨"
        subtitle="Upgrade to keep the adventures going!"
        currentTier={subState?.tier}
      />
    </AppShell>
  );
}

function StepWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl text-foreground">{title}</h2>
      {children}
    </div>
  );
}

const MAGIC_MESSAGES = [
  "Painting enchanted forests…",
  "Waking sleepy dragons…",
  "Sprinkling fairy dust…",
  "Filling the skies with stars…",
  "Opening magical portals…",
  "Tucking in friendly clouds…",
  "Polishing the moonlight…",
];

function StoryPreparation({
  total,
  done,
  stage,
  childName,
}: {
  total: number;
  done: number;
  stage: "writing" | "painting" | "binding";
  childName: string;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % MAGIC_MESSAGES.length), 2400);
    return () => clearInterval(id);
  }, []);

  const pct =
    stage === "writing"
      ? 8
      : stage === "binding"
      ? 100
      : total > 0
      ? Math.max(10, Math.round((done / total) * 92) + 8)
      : 12;

  const Row = ({ label, state }: { label: string; state: "done" | "active" | "pending" }) => (
    <div className="flex items-center gap-3 text-left">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full text-xs",
          state === "done" && "bg-mint/20 text-mint",
          state === "active" && "bg-star/20 text-star animate-pulse",
          state === "pending" && "bg-foreground/10 text-foreground/40",
        )}
      >
        {state === "done" ? "✓" : state === "active" ? "✦" : "·"}
      </span>
      <span className={cn("font-medium", state === "pending" ? "text-foreground/40" : "text-foreground")}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="grid place-items-center py-12 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="grid size-32 place-items-center rounded-full bg-gradient-to-br from-lavender via-peach to-star text-5xl shadow-[0_0_60px_oklch(0.7_0.18_295/0.5)] animate-float">
          📖
        </div>
        <span className="absolute -top-2 -left-4 text-2xl animate-twinkle">✦</span>
        <span className="absolute top-6 -right-6 text-xl animate-twinkle" style={{ animationDelay: "0.6s" }}>✦</span>
        <span className="absolute -bottom-3 left-6 text-2xl animate-twinkle" style={{ animationDelay: "1.2s" }}>✦</span>
        <span className="absolute -bottom-1 right-2 text-lg animate-twinkle" style={{ animationDelay: "1.8s" }}>☁️</span>
      </div>

      <p className="font-display text-3xl text-foreground mb-2">
        ✨ Creating {childName}'s magical adventure…
      </p>
      <p key={msgIdx} className="text-foreground/60 mb-8 animate-fade-in">
        {MAGIC_MESSAGES[msgIdx]}
      </p>

      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-hairline bg-surface/60 p-5 mb-6">
        <Row label="Writing your story" state={stage === "writing" ? "active" : "done"} />
        <Row
          label={
            stage === "painting" && total > 0
              ? `Painting illustrations (${done}/${total})`
              : "Painting illustrations"
          }
          state={stage === "writing" ? "pending" : stage === "painting" ? "active" : "done"}
        />
        <Row
          label="Binding your storybook"
          state={stage === "binding" ? "active" : stage === "writing" || stage === "painting" ? "pending" : "done"}
        />
      </div>

      <div className="w-full max-w-sm">
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-star to-peach transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
