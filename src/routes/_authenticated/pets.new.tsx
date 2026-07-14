import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pets/new")({
  head: () => ({
    meta: [
      { title: "Add a Pet Sidekick — Adventure Club" },
      { name: "description", content: "Create a furry sidekick to star alongside your adventurer." },
    ],
  }),
  component: NewPetPage,
});

const FUR_COLORS = [
  { name: "White", hex: "#f8fafc" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Golden", hex: "#fbbf24" },
  { name: "Orange", hex: "#f97316" },
  { name: "Brown", hex: "#92400e" },
  { name: "Dark Brown", hex: "#451a03" },
  { name: "Grey", hex: "#94a3b8" },
  { name: "Black", hex: "#1c1917" },
  { name: "Tabby", hex: "#d97706" },
] as const;

const EYE_COLORS = [
  { name: "Yellow", hex: "#facc15" },
  { name: "Green", hex: "#16a34a" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Brown", hex: "#92400e" },
  { name: "Amber", hex: "#d97706" },
  { name: "Grey", hex: "#94a3b8" },
] as const;

function NewPetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<"cat" | "dog" | null>(null);
  const [fur, setFur] = useState<string | null>(null);
  const [eye, setEye] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = !!user && name.trim().length > 0 && !!type && !!fur && !!eye && !saving;

  async function handleSave() {
    if (!user || !type) return;
    setSaving(true);
    const { error } = await supabase.from("pets").insert({
      user_id: user.id,
      name: name.trim(),
      type,
      fur_color: fur,
      eye_color: eye,
    });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success(`${name.trim()} is ready to adventure! 🐾`);
    navigate({ to: "/adventurers" });
  }

  return (
    <AppShell>
      <header className="mb-8 animate-slide-up">
        <Link to="/adventurers" className="text-xs text-foreground/55 hover:text-foreground">← Adventurers</Link>
        <h1 className="mt-2 font-display text-4xl text-foreground">Add a Pet Sidekick 🐾</h1>
        <p className="mt-1 text-foreground/55">A loyal friend to join the adventure.</p>
      </header>

      <div className="space-y-8 rounded-[32px] border border-hairline bg-surface/60 p-8 animate-slide-up [animation-delay:100ms]">
        <section>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-foreground/45">
            Pet name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Biscuit"
            className="w-full rounded-2xl border border-hairline bg-surface-elevated px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-star/60"
          />
        </section>

        <section>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">Type</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: "cat", label: "Cat", emoji: "🐱" },
              { id: "dog", label: "Dog", emoji: "🐶" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-2xl border p-6 transition-all",
                  type === t.id
                    ? "border-star/60 bg-star/10"
                    : "border-hairline bg-surface-elevated hover:border-foreground/30",
                )}
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-display text-xl text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">Fur colour</p>
          <div className="flex flex-wrap gap-3">
            {FUR_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setFur(c.name)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                  fur === c.name ? "border-star/70 bg-star/10 text-foreground" : "border-hairline text-foreground/70",
                )}
              >
                <span
                  className="size-5 rounded-full border border-hairline"
                  style={{ background: c.hex }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">Eye colour</p>
          <div className="flex flex-wrap gap-3">
            {EYE_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setEye(c.name)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                  eye === c.name ? "border-star/70 bg-star/10 text-foreground" : "border-hairline text-foreground/70",
                )}
              >
                <span
                  className="size-5 rounded-full border border-hairline"
                  style={{ background: c.hex }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-full bg-primary px-8 py-3 font-display text-base font-bold text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.85_0.16_88/0.6)] disabled:opacity-40 hover:scale-[1.02] transition-transform"
          >
            {saving ? "Saving…" : "Save pet 🐾"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
