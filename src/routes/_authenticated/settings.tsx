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

function genderEmoji(g: string | null | undefined) {
  const v = (g ?? "").toLowerCase();
  if (v === "boy") return "👦";
  if (v === "girl") return "👧";
  return "🧒";
}

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { children, activeChild, setActiveChildId, refresh } = useActiveChild();
  const navigate = useNavigate();
  const [parentName, setParentName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setParentName(
          data?.first_name ||
            data?.display_name ||
            (user.user_metadata?.display_name as string) ||
            user.email?.split("@")[0] ||
            "",
        );
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
                        {genderEmoji(c.gender)} {c.first_name}
                        {active && (
                          <span className="ml-2 align-middle text-[10px] uppercase tracking-widest text-star">
                            ● Active
                          </span>
                        )}
                      </p>
                      {c.nickname && (
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
