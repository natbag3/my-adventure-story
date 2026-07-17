import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { CharacterAvatar } from "@/components/character-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveChild } from "@/lib/active-child-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { openFeedbackDialog } from "@/components/feedback-dialog";
import { VoicePickerGrid, type NarrationVoiceKey } from "@/components/voice-picker";
import { PricingModal } from "@/components/pricing-modal";
import { TIERS, tierHasNarration, type Tier } from "@/lib/subscription";
import { getSubscriptionState, createPortalSession, type SubscriptionState } from "@/lib/subscription.functions";
import { track } from "@/lib/analytics";
import { NARRATION_VOICES } from "@/components/voice-picker";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Profile — Adventure Club" }] }),
  component: SettingsPage,
});


function SettingsPage() {
  const { user, signOut } = useAuth();
  const { children, activeChild, setActiveChildId, refresh } = useActiveChild();
  const navigate = useNavigate();
  const [parentName, setParentName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  const [narrationVoice, setNarrationVoice] = useState<NarrationVoiceKey | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const fetchSub = useServerFn(getSubscriptionState);
  const openPortal = useServerFn(createPortalSession);
  const hasNarration = sub ? tierHasNarration(sub.tier) : false;

  useEffect(() => {
    track("settings_viewed");
  }, []);

  // Fire subscription_cancelled / subscription_expired at most once per state
  // change per user session, based on the last-known snapshot.
  useEffect(() => {
    if (!sub || !user) return;
    try {
      const key = `sub-snap-${user.id}`;
      const prevRaw = sessionStorage.getItem(key);
      const prev = prevRaw ? (JSON.parse(prevRaw) as { tier: string; status: string | null }) : null;
      if (prev) {
        if (sub.status === "canceled" && prev.status !== "canceled") {
          track("subscription_cancelled", { tier: sub.tier });
        }
        if (prev.tier !== "free" && sub.tier === "free" && prev.status !== "canceled") {
          track("subscription_expired", { from_tier: prev.tier });
        }
      }
      sessionStorage.setItem(key, JSON.stringify({ tier: sub.tier, status: sub.status ?? null }));
    } catch { /* ignore */ }
  }, [sub, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, display_name, narration_voice")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as {
          first_name?: string | null;
          display_name?: string | null;
          narration_voice?: NarrationVoiceKey | null;
        } | null;
        setParentName(
          d?.first_name ||
            d?.display_name ||
            (user.user_metadata?.display_name as string) ||
            user.email?.split("@")[0] ||
            "",
        );
        if (d?.narration_voice) setNarrationVoice(d.narration_voice);
      });
    fetchSub().then(setSub).catch((e) => console.error("Failed to load subscription", e));
  }, [user, fetchSub]);

  // Refresh subscription state after returning from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      toast.success("Welcome aboard! ✨ Your subscription is active.");
      // Poll for webhook to catch up
      let tries = 0;
      const prevTier = sub?.tier;
      const iv = window.setInterval(async () => {
        tries++;
        try {
          const s = await fetchSub();
          setSub(s);
          if (s.tier !== "free" || tries > 10) {
            window.clearInterval(iv);
            if (s.tier !== "free") {
              track("subscription_started", {
                tier: s.tier,
                billing_period: s.storyLimitType ?? "monthly",
              });
              if (prevTier && prevTier !== "free" && prevTier !== s.tier) {
                track("tier_upgraded", { from_tier: prevTier, to_tier: s.tier });
              }
            }
          }
        } catch {
          if (tries > 10) window.clearInterval(iv);
        }
      }, 1500);
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.toString());
      return () => window.clearInterval(iv);
    }
  }, [fetchSub, sub?.tier]);

  async function handleManageSubscription() {
    setOpeningPortal(true);
    try {
      const { url } = await openPortal({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      setOpeningPortal(false);
      toast.error(e instanceof Error ? e.message : "Could not open subscription portal");
    }
  }

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

  async function pickVoice(key: NarrationVoiceKey) {
    if (!user) return;
    setSavingVoice(true);
    const prev = narrationVoice;
    setNarrationVoice(key);
    const { error } = await supabase
      .from("profiles")
      .update({ narration_voice: key } as never)
      .eq("id", user.id);
    setSavingVoice(false);
    if (error) {
      setNarrationVoice(prev);
      toast.error(error.message);
    } else {
      const voiceLabel = NARRATION_VOICES.find((v) => v.key === key)?.label ?? key;
      track("voice_selected", { voice: key, voice_name: voiceLabel });
      toast.success("Narration voice updated");
    }
  }



  async function confirmDeleteChild() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { id, name } = deleteTarget;
    const { error } = await supabase.from("children").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    track("child_profile_deleted", { child_id: id });
    setDeleteTarget(null);
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
              onClick={handleSignOut}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </Card>

        {/* Subscription */}
        <SubscriptionCard
          sub={sub}
          openingPortal={openingPortal}
          onManage={handleManageSubscription}
          onUpgrade={() => setPricingOpen(true)}
        />

        {/* Send feedback */}
        <div className="flex justify-center">
          <button
            onClick={openFeedbackDialog}
            className="rounded-full border border-hairline bg-surface-elevated px-5 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-lavender/40 transition-colors"
          >
            💬 Send feedback
          </button>
        </div>


        {/* Narration voice (Explorer + Unlimited) */}
        {hasNarration && (
          <Card
            title="🔊 Narration Voice"
            subtitle="Choose the voice used to read stories aloud."
          >
            <VoicePickerGrid value={narrationVoice} onPick={pickVoice} disabled={savingVoice} />

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
                      {c.nickname && c.nickname.trim().toLowerCase() !== c.first_name.trim().toLowerCase() && (
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
                        onClick={() => setDeleteTarget({ id: c.id, name: c.first_name })}
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
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all their stories and adventure progress. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteChild();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        title="Upgrade your adventure"
        currentTier={sub?.tier}
      />
    </AppShell>
  );
}

function SubscriptionCard({
  sub,
  openingPortal,
  onManage,
  onUpgrade,
}: {
  sub: SubscriptionState | null;
  openingPortal: boolean;
  onManage: () => void;
  onUpgrade: () => void;
}) {
  if (!sub) {
    return (
      <section className="rounded-[28px] border border-hairline bg-surface/60 p-6 animate-slide-up">
        <h2 className="font-display text-xl text-foreground">💫 Subscription</h2>
        <p className="mt-2 text-sm text-foreground/55">Loading…</p>
      </section>
    );
  }
  const cfg = TIERS[sub.tier];
  const isPaid = sub.tier !== "free";
  const statusLabel = sub.status
    ? sub.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : isPaid
      ? "Active"
      : "Trial";
  const limit = sub.storyLimit;
  const used = sub.storiesUsed;
  const pct = limit === null ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const resetLabel = new Date(sub.resetDate + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });

  return (
    <section className="rounded-[28px] border border-hairline bg-surface/60 p-6 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-foreground">💫 Subscription</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-foreground/70">
            <span className="text-lg">{cfg.emoji}</span>
            <span className="font-display text-base text-foreground">{cfg.name}</span>
            <span className="text-foreground/40">·</span>
            <span className={sub.status === "canceled" ? "text-destructive" : "text-mint"}>
              {statusLabel}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPaid && sub.hasStripeCustomer ? (
            <button
              onClick={onManage}
              disabled={openingPortal}
              className="rounded-full border border-hairline bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            >
              {openingPortal ? "Opening…" : "Manage subscription"}
            </button>
          ) : null}
          {sub.tier !== "unlimited" && (
            <button
              onClick={onUpgrade}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {isPaid ? "Change plan" : "Upgrade ✨"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-foreground/70">
          <span>
            {limit === null
              ? `${used} stories created`
              : `${used} of ${limit} stories used${sub.storyLimitType === "monthly" ? " this month" : ""}`}
          </span>
          {limit !== null && sub.storyLimitType === "monthly" && (
            <span className="text-foreground/45">Resets {resetLabel}</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
          <div
            className={
              "h-full transition-all " +
              (pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-star" : "bg-mint")
            }
            style={{ width: limit === null ? "100%" : `${pct}%` }}
          />
        </div>
      </div>
    </section>
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
