import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PARENT_NAME } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Adventure Club" },
      { name: "description", content: "Account, notifications, and bedtime preferences." },
      { property: "og:title", content: "Settings — Adventure Club" },
      { property: "og:description", content: "Manage your Adventure Club account preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <header className="mb-10 animate-slide-up">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-star/80">Account</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground">Settings</h1>
      </header>

      <div className="grid gap-6">
        <Card title="Parent Profile">
          <Row label="Name" value={PARENT_NAME} />
          <Row label="Email" value="sarah@example.com" />
          <Row label="Password" value="••••••••" actionLabel="Change" />
        </Card>

        <Card title="Bedtime Preferences">
          <Toggle label="Quiet mode after 9pm" defaultOn />
          <Toggle label="Auto-narrate new stories" defaultOn />
          <Toggle label="Daily reminder at 7:30pm" />
        </Card>

        <Card title="Educational Goals">
          <p className="text-sm text-foreground/55 mb-3">
            We'll gently weave these themes into Leo's stories more often.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Reading confidence", "Empathy", "Numbers & counting", "Nature & science", "Emotional resilience"].map((t) => (
              <span key={t} className="rounded-full border border-hairline bg-surface-elevated px-3 py-1.5 text-xs text-foreground/80">
                {t}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Privacy & Data">
          <Row label="Download my data" value="" actionLabel="Request" />
          <Row label="Delete account" value="" actionLabel="Delete" destructive />
        </Card>

        <button className="mx-auto mt-2 rounded-full border border-hairline bg-surface/60 px-6 py-2.5 text-sm font-medium text-foreground/70">
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

function Row({
  label,
  value,
  actionLabel,
  destructive,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {value && <p className="text-xs text-foreground/55">{value}</p>}
      </div>
      {actionLabel && (
        <button
          className={
            "text-sm font-medium " +
            (destructive ? "text-destructive hover:underline" : "text-lavender hover:underline")
          }
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer border-b border-hairline pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <span className="relative h-6 w-11 rounded-full bg-foreground/15 transition-colors peer-checked:bg-primary">
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
