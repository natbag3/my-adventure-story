import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Set a new password — Adventure Club" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery tokens from the URL hash on load.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth", replace: true }), 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center magical-bg px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-star to-peach shadow-[0_0_30px_oklch(0.85_0.16_88/0.45)]">
            <span className="font-display text-2xl font-bold text-ink">A</span>
          </div>
          <h1 className="font-display text-3xl text-foreground text-balance">
            Set a new password
          </h1>
          <p className="mt-3 text-sm text-foreground/60">
            Choose a new password for your Adventure Club account.
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface/70 p-7 backdrop-blur-xl card-glow">
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-foreground">
                Password updated! Redirecting you to sign in…
              </p>
            </div>
          ) : !ready ? (
            <p className="text-center text-sm text-foreground/60">
              Verifying your reset link…
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">
                  New password
                </span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">
                  Confirm password
                </span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_oklch(0.85_0.16_88/0.6)] transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
