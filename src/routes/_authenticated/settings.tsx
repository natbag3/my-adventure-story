import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Adventure Club" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (user) {
      setDisplayName((user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "");
    }
  }, [user]);

  async function handleSignOut() {
    await signOut();
    toast.success("See you tomorrow night ✨");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Account</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Settings</h1>
      </header>

      <div className="grid gap-6">
        <Card title="Parent Profile">
          <Row label="Name" value={displayName} />
          <Row label="Email" value={user?.email ?? "—"} />
        </Card>

        <Card title="Adventurers">
          <p className="text-sm text-foreground/55 mb-3">
            Manage every child profile — edit, add another, or remove.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate({ to: "/adventurers" })}
              className="rounded-full border border-hairline bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground"
            >
              Manage adventurers
            </button>
            <button
              onClick={() => navigate({ to: "/onboarding" })}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              + Add another
            </button>
          </div>
        </Card>

        <button
          onClick={handleSignOut}
          className="mx-auto mt-2 rounded-full border border-hairline bg-surface/60 px-6 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-hairline bg-surface/60 p-6 animate-slide-up">
      <h2 className="font-display text-xl text-foreground mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4 last:border-0 last:pb-0">
      <p className="text-sm text-foreground">{label}</p>
      <p className="text-xs text-foreground/70">{value}</p>
    </div>
  );
}
