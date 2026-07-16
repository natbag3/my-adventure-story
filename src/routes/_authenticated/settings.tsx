import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CharacterAvatar } from "@/components/character-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveChild } from "@/lib/active-child-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Profile — Adventure Club" }] }),
  component: SettingsPage,
});

const VOICES = [
  { id: "cgSgspJ2msm6clMCkdW9", flag: "🇺🇸", label: "Jessica", sub: "US · Female" },
  { id: "pNInz6obpgDQGcFmaJgB", flag: "🇺🇸", label: "Adam", sub: "US · Male" },
  { id: "XB0fDUnXU5powFXDhCwa", flag: "🇬🇧", label: "Charlotte", sub: "UK · Female" },
  { id: "onwK4e9ZLuTAKqWW03F9", flag: "🇬🇧", label: "Daniel", sub: "UK · Male" },
] as const;

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { children, activeChild, setActiveChildId, refresh } = useActiveChild();
  const navigate = useNavigate();
  const [parentName, setParentName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<string>(VOICES[0].id);
  const [savingVoice, setSavingVoice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, display_name, is_premium, preferred_voice")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as {
          first_name?: string | null;
          display_name?: string | null;
          is_premium?: boolean | null;
          preferred_voice?: string | null;
        } | null;
        setParentName(
          d?.first_name ||
            d?.display_name ||
            (user.user_metadata?.display_name as string) ||
            user.email?.split("@")[0] ||
            "",
        );
        setIsPremium(!!d?.is_premium);
        if (d?.preferred_voice) setPreferredVoice(d.preferred_voice);
      });
  }, [user]);

  async function saveParentName() {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: parentName.trim() || null, display_name: parentName.trim() || null })
      .eq("id", user.id);
    setSavingName(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function pickVoice(voiceId: string) {
    if (!user) return;
    setSavingVoice(voiceId);
    const prev = preferredVoice;
    setPreferredVoice(voiceId);
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_voice: voiceId } as never)
      .eq("id", user.id);
    setSavingVoice(null);
    if (error) {
      setPreferredVoice(prev);
      toast.error(error.message);
    } else {
      toast.success("Narration voice updated");
    }
  }


  async function deleteChild(id: string, name: string) {
    if (!confirm(`Remove ${name}'s profile? This can't be undone.`)) return;
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`${name}'s profile removed`);
    await refresh();
  }

  async function handleSignOut() {
    await signOut();
    toast.success("See you tomorrow night ✨");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Account</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Profile</h1>
        <p className="mt-2 text-foreground/55">
          Manage your Parent Account and every child adventurer.
        </p>
      </header>

      <div className="grid gap-6">
        {/* Parent Account */}
        <Card title="👨‍👩‍👧 Parent Account" subtitle="Used to manage your family's adventures.">
          <Field label="Parent's first name">
            <div className="flex gap-2">
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="flex-1 rounded-2xl border border-hairline bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-lavender/60"
              />
              <button
                onClick={saveParentName}
                disabled={savingName}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {savingName ? "…" : "Save"}
              </button>
            </div>
          </Field>
          <Row label="Email" value={user?.email ?? "—"} />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => navigate({ to: "/subscription" })}
              className="rounded-full border border-hairline bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground"
            >
              Subscription
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </Card>

        {/* Narration voice (premium only) */}
        {isPremium && (
          <Card
            title="🔊 Narration Voice"
            subtitle="Choose the voice used to read stories aloud."
          >
            <div className="grid grid-cols-2 gap-3">
              {VOICES.map((v) => {
                const selected = preferredVoice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => pickVoice(v.id)}
                    disabled={savingVoice !== null}
                    className={
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors " +
                      (selected
                        ? "border-star/60 bg-star/10"
                        : "border-hairline bg-surface-elevated hover:border-lavender/40")
                    }
                  >
                    <span className="text-2xl">{v.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base text-foreground">{v.label}</p>
                      <p className="text-xs text-foreground/50">{v.sub}</p>
                    </div>
                    {selected && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-star">
                        ● Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Children */}
        <Card
          title="🧒 Children"
          subtitle="Switch between adventurers or add a new one. Each child has their own stories, passport, and progress."
        >
          {children.length === 0 ? (
            <p className="text-sm text-foreground/55">No adventurers yet.</p>
          ) : (
            <ul className="space-y-3">
              {children.map((c) => {
                const active = c.id === activeChild?.id;
                return (
                  <li
                    key={c.id}
                    className={
                      "flex items-center gap-4 rounded-2xl border p-3 transition-colors " +
                      (active
                        ? "border-star/50 bg-star/10"
                        : "border-hairline bg-surface-elevated")
                    }
                  >
                    <span className="overflow-hidden grid size-12 place-items-center rounded-full bg-surface text-lg shrink-0">
                      <CharacterAvatar
                        portraitPath={c.portrait_url}
                        alt={c.first_name}
                        className="size-full"
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base text-foreground truncate">
                        {c.first_name}
                        {active && (
                          <span className="ml-2 align-middle text-[10px] uppercase tracking-widest text-star">
                            ● Active
                          </span>
                        )}
                      </p>
                      {c.nickname && c.nickname !== c.first_name && (
                        <p className="text-xs text-foreground/50">aka {c.nickname}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!active && (
                        <button
                          onClick={() => setActiveChildId(c.id)}
                          className="rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground"
                        >
                          Switch to
                        </button>
                      )}
                      <button
                        onClick={() => navigate({ to: "/adventurers" })}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteChild(c.id, c.first_name)}
                        className="rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-foreground/55 hover:text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            to="/onboarding"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            ➕ Add New Adventurer
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-hairline bg-surface/60 p-6 animate-slide-up">
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-foreground/55">{subtitle}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-foreground">{label}</p>
      <p className="text-xs text-foreground/70">{value}</p>
    </div>
  );
}
