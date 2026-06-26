import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CharacterAvatar } from "@/components/character-avatar";
import { ADVENTURES, MOODS, LESSONS, LENGTHS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { generateStory } from "@/lib/stories.functions";

type ChildRow = { id: string; first_name: string; avatar_emoji: string | null; portrait_url: string | null; date_of_birth: string | null };
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

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create Tonight's Adventure — Adventure Club" },
      { name: "description", content: "Build a one-of-a-kind bedtime story in a few magical taps." },
      { property: "og:title", content: "Create Tonight's Adventure — Adventure Club" },
      { property: "og:description", content: "Build a personalized bedtime adventure for your child." },
    ],
  }),
  component: CreateWizard,
});

const STEPS = ["Adventurer", "World", "Mood", "Lesson", "Length", "Generate"] as const;

function CreateWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [step, setStep] = useState(0);
  const [child, setChild] = useState<string | null>(null);
  const [adventure, setAdventure] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>("bedtime");
  const [lesson, setLesson] = useState<string | null>(null);
  const [length, setLength] = useState<3 | 5 | 10>(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateFn = useServerFn(generateStory);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("children")
      .select("id, first_name, avatar_emoji, portrait_url, date_of_birth")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = (data ?? []) as ChildRow[];
        setChildren(list);
        if (list.length === 1) setChild(list[0].id);
        // Skip "choose child" step if only one
        if (list.length === 1) setStep((s) => (s === 0 ? 1 : s));
      });
  }, [user]);

  const selectedChild = children.find((c) => c.id === child);

  const canNext =
    (step === 0 && !!child) ||
    (step === 1 && !!adventure) ||
    (step === 2 && !!mood) ||
    (step === 3 && !!lesson) ||
    step === 4 ||
    step === 5;

  async function handleGenerate() {
    if (!child || !adventure || !lesson || !mood) return;
    setGenerating(true);
    setError(null);
    try {
      const adventureLabel = ADVENTURES.find((a) => a.id === adventure)?.label ?? adventure;
      const moodLabel = MOODS.find((m) => m.id === mood)?.label ?? mood;
      const lessonLabel = LESSONS.find((l) => l.id === lesson)?.label ?? lesson;
      const result = await generateFn({
        data: {
          childId: child,
          theme: adventureLabel,
          mood: moodLabel,
          lesson: lessonLabel,
          lengthMinutes: length,
        },
      });
      navigate({ to: "/story/$id", params: { id: result.storyId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <Link to="/" className="text-xs text-foreground/55 hover:text-foreground">← Home</Link>
        <h1 className="mt-2 font-display text-4xl text-foreground">Create Tonight's Adventure</h1>
        <p className="mt-1 text-foreground/55">Six small choices. One magical story.</p>
      </header>

      {/* Stepper */}
      <div className="mb-10 flex flex-wrap items-center gap-2 animate-slide-up [animation-delay:100ms]">
        {STEPS.map((label, i) => (
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
              <span className="grid size-5 place-items-center rounded-full bg-foreground/10 text-[10px]">{i + 1}</span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="text-foreground/20">·</span>}
          </div>
        ))}
      </div>

      <div className="rounded-[32px] border border-hairline bg-surface/60 p-8 min-h-[420px] animate-slide-up [animation-delay:200ms]">
        {step === 0 && (
          <StepWrap title="Who is tonight's adventure for?">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {children.map((c) => {
                const age = calcAge(c.date_of_birth);
                return (
                  <button
                    key={c.id}
                    onClick={() => setChild(c.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-3xl border p-6 transition-all",
                      child === c.id
                        ? "border-star/60 bg-star/10"
                        : "border-hairline bg-surface-elevated hover:border-foreground/30",
                    )}
                  >
                    <span className="overflow-hidden size-20 rounded-full bg-paper shadow-lg ring-2 ring-paper/60"><CharacterAvatar portraitPath={c.portrait_url} alt={c.first_name} className="size-full" /></span>
                    <span className="font-display text-lg text-foreground">{c.first_name}</span>
                    {age != null && <span className="text-xs text-foreground/55">Age {age}</span>}
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
          </StepWrap>
        )}

        {step === 1 && (
          <StepWrap title="Where shall we go?">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ADVENTURES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAdventure(a.id)}
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
                  onClick={() => setMood(m.id)}
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
                  onClick={() => setLesson(l.id)}
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
            {!generating ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-6 grid size-28 place-items-center rounded-full bg-gradient-to-br from-star to-peach text-5xl shadow-[0_0_40px_oklch(0.85_0.16_88/0.5)] animate-float">
                  ✨
                </div>
                <p className="font-display text-2xl text-foreground mb-2">Everything looks magical.</p>
                <p className="text-foreground/55 mb-8">
                  We'll craft a {length}-minute {MOODS.find((m) => m.id === mood)?.label.toLowerCase()} adventure for{" "}
                  {selectedChild?.first_name ?? "your adventurer"} in the world of{" "}
                  {ADVENTURES.find((a) => a.id === adventure)?.label ?? "wonder"}.
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
            ) : (
              <GeneratingState />
            )}
          </StepWrap>
        )}
      </div>

      {/* Navigation */}
      {!generating && (
        <div className="mt-6 flex items-center justify-between animate-fade-in">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
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

function GeneratingState() {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="relative mb-8">
        <div className="grid size-32 place-items-center rounded-full bg-gradient-to-br from-lavender via-peach to-star text-5xl shadow-[0_0_60px_oklch(0.7_0.18_295/0.5)] animate-float">
          🌙
        </div>
        <span className="absolute -top-2 -left-4 text-2xl animate-twinkle">✦</span>
        <span className="absolute top-6 -right-6 text-xl animate-twinkle" style={{ animationDelay: "0.6s" }}>✦</span>
        <span className="absolute -bottom-3 left-6 text-2xl animate-twinkle" style={{ animationDelay: "1.2s" }}>✦</span>
        <span className="absolute -bottom-1 right-2 text-lg animate-twinkle" style={{ animationDelay: "1.8s" }}>☁️</span>
      </div>
      <p className="font-display text-2xl text-foreground mb-2">Spinning starlight into a story…</p>
      <p className="text-foreground/55">Drawing illustrations · choosing words · sprinkling magic</p>
    </div>
  );
}
