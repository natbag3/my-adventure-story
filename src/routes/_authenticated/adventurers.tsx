import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CharacterAvatar } from "@/components/character-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { generateChildPortrait } from "@/lib/portraits.functions";
import { toast } from "sonner";

type ChildRow = {
  id: string;
  first_name: string;
  nickname: string | null;
  avatar_emoji: string | null;
  portrait_url: string | null;
  date_of_birth: string | null;
  personality_traits: string[];
  favorite_animals: string[];
  favorite_foods: string[];
  favorite_colors: string[];
  hair_color: string | null;
  eye_color: string | null;
};

export const Route = createFileRoute("/_authenticated/adventurers")({
  head: () => ({
    meta: [
      { title: "My Adventurers — Adventure Club" },
      { name: "description", content: "Manage every child profile — looks, personality, and favorite things." },
    ],
  }),
  component: AdventurersPage,
});

function calcAge(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const ACCENTS = ["peach", "lavender", "mint", "star"] as const;

function AdventurersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("children")
      .select("id, first_name, nickname, avatar_emoji, portrait_url, date_of_birth, personality_traits, favorite_animals, favorite_foods, favorite_colors, hair_color, eye_color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(error.message);
        setChildren((data ?? []) as ChildRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function deleteChild(id: string, name: string) {
    if (!confirm(`Remove ${name}'s profile? This can't be undone.`)) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setChildren((cs) => cs.filter((c) => c.id !== id));
    toast.success(`${name}'s profile removed`);
  }

  async function regeneratePortrait(id: string, name: string) {
    const t = toast.loading(`Drawing ${name}'s portrait…`);
    try {
      await generateChildPortrait({ data: { childId: id } });
      // refetch
      const { data } = await supabase
        .from("children")
        .select("portrait_url")
        .eq("id", id)
        .single();
      setChildren((cs) =>
        cs.map((c) => (c.id === id ? { ...c, portrait_url: data?.portrait_url ?? c.portrait_url } : c)),
      );
      toast.success(`${name}'s portrait is ready ✨`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't draw portrait", { id: t });
    }
  }

  return (
    <AppShell>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 animate-slide-up">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">The heroes of every story</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">My Adventurers</h1>
        </div>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.85_0.16_88/0.6)] hover:scale-[1.02] transition-transform"
        >
          <span>+</span> Add Adventurer
        </Link>
      </header>

      {loading ? (
        <p className="text-foreground/55">Loading adventurers…</p>
      ) : children.length === 0 ? (
        <div className="rounded-3xl border border-hairline bg-surface/60 p-10 text-center">
          <p className="text-foreground/65">No adventurers yet.</p>
          <Link to="/onboarding" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Create your first adventurer
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((c, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const age = calcAge(c.date_of_birth);
            return (
              <div
                key={c.id}
                style={{ animationDelay: `${i * 80}ms` }}
                className="animate-slide-up overflow-hidden rounded-[32px] border border-hairline bg-surface card-glow"
              >
                <div className={`relative h-40 bg-gradient-to-br ${
                  accent === "peach" ? "from-peach/40 to-lavender/20"
                  : accent === "lavender" ? "from-lavender/40 to-mint/20"
                  : accent === "mint" ? "from-mint/40 to-star/20"
                  : "from-star/40 to-peach/20"
                }`}>
                  <span className="absolute bottom-4 left-6 overflow-hidden rounded-full bg-paper shadow-xl ring-4 ring-paper/60 size-20">
                    <CharacterAvatar portraitPath={c.portrait_url} alt={c.first_name} className="size-full" />
                  </span>
                  {age != null && (
                    <span className="absolute top-4 right-4 rounded-full bg-ink/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-paper backdrop-blur">
                      Age {age}
                    </span>
                  )}
                </div>

                <div className="p-6 pt-12">
                  <h3 className="font-display text-2xl text-foreground">{c.first_name}</h3>
                  {c.nickname && <p className="text-xs text-foreground/55">aka {c.nickname}</p>}
                  <p className="mt-2 text-sm text-foreground/55">
                    {c.favorite_animals?.length > 0 && `Loves ${c.favorite_animals.slice(0, 2).join(" & ").toLowerCase()}`}
                    {c.favorite_foods?.length > 0 && `, ${c.favorite_foods[0].toLowerCase()}`}
                    {c.favorite_colors?.length > 0 && ` & ${c.favorite_colors[0].toLowerCase()} skies.`}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(c.personality_traits ?? []).map((t) => (
                      <span key={t} className="rounded-full bg-lavender/15 px-2.5 py-0.5 text-[11px] font-medium text-lavender">{t}</span>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2 border-t border-hairline pt-5">
                    <button
                      onClick={() => deleteChild(c.id, c.first_name)}
                      className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-foreground/55 hover:text-destructive"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => navigate({ to: "/create" })}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      New Story
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
