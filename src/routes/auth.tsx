import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Sign in — Adventure Club" }],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase
            .from("profiles")
            .update({
              first_name: name || null,
              display_name: name || email.split("@")[0],
            })
            .eq("id", data.user.id);
        }
        // If a session was auto-created, sign out so the user explicitly signs in.
        if (data.session) {
          await supabase.auth.signOut();
        }
        setPassword("");
        setName("");
        setMode("signin");
        setBanner("Account created! Please sign in to start your adventure. ✨");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // forgot
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth/reset",
        });
        if (error) throw error;
        setResetSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) {
      toast.error(r.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  function switchMode(next: Mode) {
    setMode(next);
    setBanner(null);
    setResetSent(false);
  }

  return (
    <div className="relative grid min-h-screen place-items-center magical-bg px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-lavender/20 blur-[140px]" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[55%] w-[55%] rounded-full bg-peach/15 blur-[120px]" />
        {Array.from({ length: 24 }).map((_, i) => {
          const top = (i * 53) % 100;
          const left = (i * 37 + 7) % 100;
          const delay = (i % 7) * 0.4;
          const size = (i % 3) + 1;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-star/70 shadow-[0_0_8px_currentColor] animate-twinkle"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-star to-peach shadow-[0_0_30px_oklch(0.85_0.16_88/0.45)]">
            <span className="font-display text-2xl font-bold text-ink">A</span>
          </div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-star/80">
            ✨ Welcome to Adventure Club
          </p>
          <h1 className="font-display text-3xl text-foreground text-balance">
            {isSignup
              ? "👨‍👩‍👧 Let's create your Parent Account"
              : isForgot
              ? "Reset your password"
              : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm text-foreground/60 text-balance">
            {isSignup
              ? "This account lets you manage your children's adventures and story library."
              : isForgot
              ? "Enter your email and we'll send you a link to set a new password."
              : "Sign in to continue tonight's adventure."}
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface/70 p-7 backdrop-blur-xl card-glow">
          {banner && (
            <div className="mb-5 rounded-2xl border border-lavender/40 bg-lavender/10 px-4 py-3 text-center text-sm text-foreground">
              {banner}
            </div>
          )}

          {!isForgot && (
            <>
              <button
                onClick={google}
                disabled={busy}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-hairline bg-surface-elevated px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated/80 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <div className="mb-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-foreground/35">
                <span className="h-px flex-1 bg-hairline" />
                or
                <span className="h-px flex-1 bg-hairline" />
              </div>
            </>
          )}

          {isForgot && resetSent ? (
            <div className="space-y-5 text-center">
              <p className="text-sm text-foreground">
                Check your inbox — we've sent you a password reset link.
              </p>
              <button
                onClick={() => switchMode("signin")}
                className="text-sm font-medium text-lavender hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <Field label="Parent's first name">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah"
                    className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
                  />
                </Field>
              )}
              <Field label={isSignup ? "Parent's email" : "Email"}>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
                />
              </Field>
              {!isForgot && (
                <Field label="Password">
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
                  />
                </Field>
              )}

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs font-medium text-lavender hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_oklch(0.85_0.16_88/0.6)] transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                {busy
                  ? "Just a moment…"
                  : isSignup
                  ? "Create Parent Account"
                  : isForgot
                  ? "Send reset link"
                  : "Sign in"}
              </button>
              {isSignup && (
                <p className="text-center text-xs text-foreground/45">
                  Next, you'll create your child's Adventurer profile.
                </p>
              )}
            </form>
          )}

          <p className="mt-5 text-center text-xs text-foreground/55">
            {isForgot ? (
              <button
                onClick={() => switchMode("signin")}
                className="font-medium text-lavender hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <>
                {isSignup ? "Already have an account?" : "New to Adventure Club?"}{" "}
                <button
                  onClick={() => switchMode(isSignup ? "signin" : "signup")}
                  className="font-medium text-lavender hover:underline"
                >
                  {isSignup ? "Sign in" : "Create one"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
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
