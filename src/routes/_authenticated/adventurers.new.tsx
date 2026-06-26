import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/adventurers/new")({
  head: () => ({
    meta: [
      { title: "New Adventurer — Adventure Club" },
      { name: "description", content: "Create a new child profile so stories can star them as the hero." },
    ],
  }),
  component: NewAdventurerPage,
});

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "looks", label: "Looks" },
  { id: "favorites", label: "Favorites" },
  { id: "heart", label: "Heart & Mind" },
  { id: "photo", label: "Reference Photo" },
];

function NewAdventurerPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("basics");

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <Link to="/adventurers" className="text-xs text-foreground/55 hover:text-foreground">
          ← Adventurers
        </Link>
        <h1 className="mt-2 font-display text-4xl text-foreground">Create a new adventurer</h1>
        <p className="mt-1 text-foreground/55">
          The more we know, the more magical their stories become — every detail shapes the hero.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px,1fr] animate-slide-up [animation-delay:100ms]">
        {/* Sidebar */}
        <aside className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={
                "block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors " +
                (active === s.id
                  ? "bg-surface text-foreground border border-hairline"
                  : "text-foreground/55 hover:text-foreground")
              }
            >
              {s.label}
            </button>
          ))}
        </aside>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/adventurers" });
          }}
          className="rounded-[28px] border border-hairline bg-surface/70 p-8"
        >
          {active === "basics" && (
            <Section title="The basics">
              <Field label="Name"><Input placeholder="e.g. Leo" /></Field>
              <Field label="Age"><Input type="number" min={1} max={14} placeholder="6" /></Field>
              <Field label="Birthday"><Input type="date" /></Field>
            </Section>
          )}
          {active === "looks" && (
            <Section title="What they look like">
              <Field label="Hair color"><Input placeholder="Brown, curly" /></Field>
              <Field label="Eye color"><Input placeholder="Amber" /></Field>
              <Field label="Skin tone"><Input placeholder="Warm beige" /></Field>
              <Field label="Character avatar">
                <div className="flex flex-wrap gap-3 mt-1">
                  {["🦁", "🦊", "🐻", "🦄", "🐲", "🐙", "🐯", "🦉"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="grid size-14 place-items-center rounded-2xl border border-hairline bg-surface-elevated text-2xl hover:border-lavender/60"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
          )}
          {active === "favorites" && (
            <Section title="Their favorite things">
              <Field label="Favorite color"><Input placeholder="Forest green" /></Field>
              <Field label="Favorite animal"><Input placeholder="Dragon" /></Field>
              <Field label="Favorite toy"><Input placeholder="Wooden sword" /></Field>
              <Field label="Favorite food"><Input placeholder="Pancakes" /></Field>
            </Section>
          )}
          {active === "heart" && (
            <Section title="Heart & mind">
              <Field label="Personality traits"><Input placeholder="Curious, brave, gentle" /></Field>
              <Field label="Things they want to learn"><Input placeholder="Constellations, volcanoes" /></Field>
              <Field label="Fears (we'll handle them gently)"><Input placeholder="The dark" /></Field>
            </Section>
          )}
          {active === "photo" && (
            <Section title="One reference photo">
              <p className="text-sm text-foreground/55 mb-4">
                We'll use this only to create a consistent illustrated version of your child — never stored as a photograph.
              </p>
              <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-hairline bg-surface-elevated p-12 text-center hover:border-lavender/60">
                <div className="text-4xl mb-3">📷</div>
                <p className="font-display text-foreground">Tap to upload reference photo</p>
                <p className="mt-1 text-xs text-foreground/45">PNG or JPG, up to 5MB</p>
                <input type="file" accept="image/*" className="sr-only" />
              </label>
            </Section>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-hairline pt-6">
            <Link to="/adventurers" className="text-sm text-foreground/55 hover:text-foreground">
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.85_0.16_88/0.6)] hover:scale-[1.02] transition-transform"
            >
              Save Adventurer
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground mb-6">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-foreground/50">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
    />
  );
}
