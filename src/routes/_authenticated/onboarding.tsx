import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Create your adventurer — Adventure Club" }] }),
  component: OnboardingPage,
});

type FormState = {
  first_name: string;
  nickname: string;
  date_of_birth: string;
  reference_photo: File | null;
  reference_photo_preview: string | null;
  avatar_emoji: string;
  hair_color: string;
  hair_style: string;
  eye_color: string;
  skin_tone: string;
  freckles: boolean;
  glasses: boolean;
  outfit_color: string;
  shoes: string;
  personality_answers: {
    smile: string;
    good_at: string;
    brave: string;
    curious: string;
  };
  personality_traits: string[];
  favorite_animals: string[];
  favorite_colors: string[];
  favorite_foods: string[];
  favorite_toys: string[];
  favorite_story_themes: string[];
  favorite_hobbies: string[];
  favorite_places: string[];
  learning_goals: string[];
};

const HAIR_COLORS = [
  { id: "Black", hex: "#1c1917" },
  { id: "Brown", hex: "#78350f" },
  { id: "Blonde", hex: "#fcd34d" },
  { id: "Red", hex: "#dc2626" },
  { id: "Auburn", hex: "#9a3412" },
  { id: "Silver", hex: "#cbd5e1" },
];
const HAIR_STYLES = [
  { id: "Short", emoji: "💇" },
  { id: "Long", emoji: "💁" },
  { id: "Curly", emoji: "👩‍🦱" },
  { id: "Wavy", emoji: "🌊" },
  { id: "Braided", emoji: "👧" },
  { id: "Buzzed", emoji: "👦" },
];
const EYE_COLORS = [
  { id: "Brown", hex: "#7c2d12" },
  { id: "Hazel", hex: "#a16207" },
  { id: "Green", hex: "#15803d" },
  { id: "Blue", hex: "#1d4ed8" },
  { id: "Grey", hex: "#475569" },
  { id: "Amber", hex: "#d97706" },
];
const SKIN_TONES = [
  { id: "Porcelain", hex: "#fde7d3" },
  { id: "Fair", hex: "#f5d2a8" },
  { id: "Warm beige", hex: "#e0b07a" },
  { id: "Tan", hex: "#c08a55" },
  { id: "Deep", hex: "#8b5a35" },
  { id: "Rich", hex: "#5a3a22" },
];
const OUTFIT_COLORS = [
  { id: "Lavender", hex: "#c4b5fd" },
  { id: "Mint", hex: "#86efac" },
  { id: "Peach", hex: "#fdba74" },
  { id: "Sky", hex: "#7dd3fc" },
  { id: "Rose", hex: "#fda4af" },
  { id: "Forest", hex: "#16a34a" },
  { id: "Navy", hex: "#1e3a8a" },
  { id: "Gold", hex: "#fbbf24" },
];
const SHOES = ["Sneakers", "Boots", "Sandals", "Wellies", "Slippers", "Magical"];
const AVATARS = ["🦁", "🦊", "🐻", "🦄", "🐲", "🐙", "🐯", "🦉", "🐸", "🦋"];

const TRAITS = [
  "Brave", "Kind", "Funny", "Creative", "Curious",
  "Gentle", "Adventurous", "Helpful", "Confident", "Thoughtful",
];

const FAV_ANIMALS = ["🐶 Dog","🐱 Cat","🐉 Dragon","🦄 Unicorn","🦖 Dinosaur","🐼 Panda","🐘 Elephant","🦁 Lion","🐯 Tiger","🐬 Dolphin","🦈 Shark","🦊 Fox","🐨 Koala","🐧 Penguin","🐰 Rabbit","🐴 Horse","🐦 Bird","🐻 Bear"];
const FAV_COLORS_PILLS = [
  { id: "Red", hex: "#ef4444" },
  { id: "Orange", hex: "#f97316" },
  { id: "Yellow", hex: "#facc15" },
  { id: "Green", hex: "#22c55e" },
  { id: "Blue", hex: "#3b82f6" },
  { id: "Purple", hex: "#a855f7" },
  { id: "Pink", hex: "#ec4899" },
  { id: "Turquoise", hex: "#14b8a6" },
  { id: "Gold", hex: "#eab308" },
  { id: "Silver", hex: "#cbd5e1" },
  { id: "Rainbow", hex: "linear-gradient(135deg,#ef4444,#facc15,#22c55e,#3b82f6,#a855f7)" },
  { id: "Black", hex: "#1c1917" },
  { id: "White", hex: "#f8fafc" },
];
const FAV_FOODS = ["🥞 Pancakes","🍓 Strawberries","🍕 Pizza","🍦 Ice cream","🍝 Pasta","🥪 Sandwich","🍪 Cookies","🍎 Apples","🥕 Carrots","🍣 Sushi","🍩 Donuts","🍌 Bananas","🥦 Broccoli","🍇 Grapes","🥨 Pretzels","🌮 Tacos"];
const FAV_TOYS = ["🧸 Plushie","🪀 Yoyo","🧩 Puzzle","⚔️ Sword","🪄 Wand","🎨 Paints","🚗 Cars","🪁 Kite","🧱 Blocks","🎸 Music","🚂 Train","🎲 Board game","🪅 Piñata","🏀 Ball","🛼 Skates"];
const FAV_STORY_THEMES = ["🦖 Dinosaurs","🚀 Space","🏴‍☠️ Pirates","🐉 Dragons","🧚 Fairies","👸 Princesses","🤖 Robots","🌊 Ocean","🏕️ Camping","💰 Treasure Hunts","🌴 Jungle","🪄 Magic","🎄 Christmas","🎃 Halloween","⏳ Time Travel","🏰 Castles"];
const FAV_HOBBIES = ["📖 Reading","🎨 Drawing","⚽ Soccer","🏊 Swimming","💃 Dancing","🎵 Music","🧱 Building","✂️ Crafts","🍳 Cooking","🔬 Science","🌿 Nature","🐾 Animals","🎮 Video Games"];
const FAV_PLACES = ["🏖️ Beach","🌲 Forest","🏔️ Mountains","🦒 Zoo","🚜 Farm","🚀 Space","🏰 Castle","🌳 Treehouse","🏛️ Museum","🐠 Aquarium","🏡 Grandma's House"];

const LEARNING_GOALS = [
  { id: "Confidence", emoji: "✨" },
  { id: "Kindness", emoji: "💛" },
  { id: "Friendship", emoji: "💞" },
  { id: "Honesty", emoji: "🪞" },
  { id: "Resilience", emoji: "🌱" },
  { id: "Problem Solving", emoji: "🧩" },
  { id: "Gratitude", emoji: "🙏" },
  { id: "Empathy", emoji: "🤗" },
  { id: "Reading", emoji: "📖" },
  { id: "Numbers", emoji: "🔢" },
  { id: "Science", emoji: "🔬" },
  { id: "Geography", emoji: "🌍" },
];

function calcAge(dob: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const TOTAL_STEPS = 7;

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    nickname: "",
    date_of_birth: "",
    reference_photo: null,
    reference_photo_preview: null,
    avatar_emoji: "🦁",
    hair_color: "",
    hair_style: "",
    eye_color: "",
    skin_tone: "",
    freckles: false,
    glasses: false,
    outfit_color: "",
    shoes: "",
    personality_answers: { smile: "", good_at: "", brave: "", curious: "" },
    personality_traits: [],
    favorite_animals: [],
    favorite_colors: [],
    favorite_foods: [],
    favorite_toys: [],
    favorite_story_themes: [],
    favorite_hobbies: [],
    favorite_places: [],
    learning_goals: [],
  });

  const age = useMemo(() => calcAge(form.date_of_birth), [form.date_of_birth]);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleTrait(t: string) {
    setForm((f) => {
      const has = f.personality_traits.includes(t);
      if (has) return { ...f, personality_traits: f.personality_traits.filter((x) => x !== t) };
      if (f.personality_traits.length >= 3) {
        toast.message("Pick your top three ✨");
        return f;
      }
      return { ...f, personality_traits: [...f.personality_traits, t] };
    });
  }
  function toggleGoal(g: string) {
    setForm((f) => ({
      ...f,
      learning_goals: f.learning_goals.includes(g)
        ? f.learning_goals.filter((x) => x !== g)
        : [...f.learning_goals, g],
    }));
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5 MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, reference_photo: file, reference_photo_preview: url }));
  }

  async function save() {
    if (!user) return;
    if (!form.first_name.trim()) {
      toast.error("Please add your child's name");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      let photoUrl: string | null = null;
      if (form.reference_photo) {
        const ext = form.reference_photo.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("adventurer-photos")
          .upload(path, form.reference_photo, { upsert: true });
        if (upErr) throw upErr;
        photoUrl = path;
      }

      const { error } = await supabase.from("children").insert({
        user_id: user.id,
        first_name: form.first_name.trim(),
        nickname: form.nickname.trim() || null,
        date_of_birth: form.date_of_birth || null,
        reference_photo_url: photoUrl,
        avatar_emoji: form.avatar_emoji,
        hair_color: form.hair_color || null,
        hair_style: form.hair_style || null,
        eye_color: form.eye_color || null,
        skin_tone: form.skin_tone || null,
        freckles: form.freckles,
        glasses: form.glasses,
        outfit_color: form.outfit_color || null,
        shoes: form.shoes || null,
        personality_answers: form.personality_answers,
        personality_traits: form.personality_traits,
        favorite_animals: form.favorite_animals,
        favorite_colors: form.favorite_colors,
        favorite_foods: form.favorite_foods,
        favorite_toys: form.favorite_toys,
        favorite_story_themes: form.favorite_story_themes,
        favorite_hobbies: form.favorite_hobbies,
        favorite_places: form.favorite_places,
        learning_goals: form.learning_goals,
      });
      if (error) throw error;
      setStep(6); // success screen
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen magical-bg">
      <AmbientSky />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
        {/* Progress */}
        {step > 0 && step < 6 && (
          <div className="mb-8 flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-xs text-foreground/55 hover:text-foreground"
            >
              ← Back
            </button>
            <div className="ml-3 flex flex-1 gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1 flex-1 rounded-full transition-colors " +
                    (i < step ? "bg-star" : "bg-foreground/15")
                  }
                />
              ))}
            </div>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-foreground/40">
              {step} / 5
            </span>
          </div>
        )}

        <div className="flex-1 animate-slide-up">
          {step === 0 && <ScreenIntro onStart={() => setStep(1)} />}
          {step === 1 && (
            <ScreenBasics
              form={form}
              update={update}
              age={age}
              fileRef={fileRef}
              onPhoto={onPhoto}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && <ScreenAppearance form={form} update={update} onNext={() => setStep(3)} />}
          {step === 3 && (
            <ScreenPersonality
              form={form}
              setForm={setForm}
              toggleTrait={toggleTrait}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && <ScreenFavorites form={form} update={update} onNext={() => setStep(5)} />}
          {step === 5 && (
            <ScreenLearning form={form} toggleGoal={toggleGoal} busy={busy} onSave={save} />
          )}
          {step === 6 && (
            <ScreenSuccess
              name={form.first_name}
              onCreate={() => navigate({ to: "/create" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AmbientSky() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-lavender/20 blur-[140px]" />
      <div className="absolute -bottom-[10%] -left-[10%] h-[55%] w-[55%] rounded-full bg-peach/15 blur-[120px]" />
      {Array.from({ length: 30 }).map((_, i) => {
        const top = (i * 53) % 100;
        const left = (i * 37 + 7) % 100;
        const delay = (i % 7) * 0.4;
        const size = (i % 3) + 1;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-star/70 shadow-[0_0_8px_currentColor] animate-twinkle"
            style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, animationDelay: `${delay}s` }}
          />
        );
      })}
    </div>
  );
}

// ---------- Screens ----------

function ScreenIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div className="max-w-lg">
        <div className="mb-8 flex justify-center gap-3 text-5xl">
          <span className="animate-float">⭐</span>
          <span className="animate-float [animation-delay:300ms]">🌙</span>
          <span className="animate-float [animation-delay:600ms]">☁️</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground text-balance leading-tight">
          Let's create your little adventurer! <span className="text-star">✨</span>
        </h1>
        <p className="mt-5 text-lg text-foreground/65 text-balance leading-relaxed">
          Every magical adventure begins with your child. Tell us a little about them
          so we can make them the hero of every bedtime story.
        </p>
        <button
          onClick={onStart}
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_24px_60px_-20px_oklch(0.85_0.16_88/0.55)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Let's Begin
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

function ScreenBasics({
  form, update, age, fileRef, onPhoto, onNext,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  age: number | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}) {
  const valid = form.first_name.trim().length > 0;
  return (
    <ScreenCard title="Basic Information" subtitle="Tell us about your little hero.">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative grid size-36 place-items-center rounded-full border-2 border-dashed border-hairline bg-surface-elevated overflow-hidden hover:border-lavender/60 transition-colors"
        >
          {form.reference_photo_preview ? (
            <img src={form.reference_photo_preview} alt="" className="size-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="text-4xl">{form.avatar_emoji}</div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-foreground/45">
                Add photo
              </div>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
        <p className="mt-3 text-xs text-foreground/45">Optional — helps us draw them consistently</p>
      </div>

      <Field label="First name">
        <Input value={form.first_name} onChange={(v) => update("first_name", v)} placeholder="Leo" />
      </Field>
      <Field label="Nickname (optional)">
        <Input value={form.nickname} onChange={(v) => update("nickname", v)} placeholder="Little Bear" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date of birth">
          <Input
            type="date"
            value={form.date_of_birth}
            onChange={(v) => update("date_of_birth", v)}
          />
        </Field>
        <Field label="Age">
          <div className="grid h-12 place-items-center rounded-2xl border border-hairline bg-background/40 font-display text-xl text-foreground">
            {age != null ? age : "—"}
          </div>
        </Field>
      </div>

      <NextButton disabled={!valid} onClick={onNext}>Continue</NextButton>
    </ScreenCard>
  );
}

function ScreenAppearance({
  form, update, onNext,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onNext: () => void;
}) {
  return (
    <ScreenCard title="Appearance" subtitle="Bring your adventurer to life.">
      <div className="grid gap-6 md:grid-cols-[1fr,180px]">
        <div className="space-y-6">
          <ColorPicker label="Hair colour" value={form.hair_color} options={HAIR_COLORS}
            onChange={(v) => update("hair_color", v)} />
          <ChipPicker label="Hair style" value={form.hair_style} options={HAIR_STYLES.map((s) => ({ id: s.id, label: `${s.emoji} ${s.id}` }))}
            onChange={(v) => update("hair_style", v)} />
          <ColorPicker label="Eye colour" value={form.eye_color} options={EYE_COLORS}
            onChange={(v) => update("eye_color", v)} />
          <ColorPicker label="Skin tone" value={form.skin_tone} options={SKIN_TONES}
            onChange={(v) => update("skin_tone", v)} />

          <div className="grid grid-cols-2 gap-3">
            <ToggleCard active={form.freckles} onClick={() => update("freckles", !form.freckles)}>
              <span className="text-2xl">🟤</span>
              <span>Freckles</span>
            </ToggleCard>
            <ToggleCard active={form.glasses} onClick={() => update("glasses", !form.glasses)}>
              <span className="text-2xl">👓</span>
              <span>Glasses</span>
            </ToggleCard>
          </div>

          <ColorPicker label="Favourite outfit colour" value={form.outfit_color} options={OUTFIT_COLORS}
            onChange={(v) => update("outfit_color", v)} />
          <ChipPicker label="Favourite shoes" value={form.shoes}
            options={SHOES.map((s) => ({ id: s, label: s }))}
            onChange={(v) => update("shoes", v)} />
        </div>

        {/* Live preview */}
        <div className="sticky top-6 self-start">
          <div className="rounded-3xl border border-hairline bg-surface-elevated p-5 text-center card-glow">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/45">
              Preview
            </p>
            <div className="mx-auto grid size-28 place-items-center rounded-full"
              style={{ background: form.skin_tone ? skinHex(form.skin_tone) : "var(--surface)" }}>
              <span className="text-5xl">{form.avatar_emoji}</span>
            </div>
            <p className="mt-3 font-display text-lg text-foreground">{form.hair_color || "—"}</p>
            <p className="text-xs text-foreground/55">{form.hair_style || "Choose a style"}</p>
            <div className="mt-3 flex justify-center gap-2 text-xs text-foreground/55">
              {form.freckles && <span>· freckles</span>}
              {form.glasses && <span>· glasses</span>}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {AVATARS.slice(0, 10).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => update("avatar_emoji", e)}
                  className={
                    "grid aspect-square place-items-center rounded-lg text-lg transition-colors " +
                    (form.avatar_emoji === e ? "bg-lavender/30 ring-1 ring-lavender" : "hover:bg-foreground/5")
                  }
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NextButton onClick={onNext}>Continue</NextButton>
    </ScreenCard>
  );
}

function skinHex(id: string) {
  const t = SKIN_TONES.find((s) => s.id === id);
  return t ? t.hex : "var(--surface)";
}

function ScreenPersonality({
  form, setForm, toggleTrait, onNext,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  toggleTrait: (t: string) => void;
  onNext: () => void;
}) {
  return (
    <ScreenCard title="Personality" subtitle="The little things that make them shine.">
      <PromptField label="What makes your child smile?" placeholder="Bedtime giggles, surprise pancakes…"
        value={form.personality_answers.smile}
        onChange={(v) => setForm((f) => ({ ...f, personality_answers: { ...f.personality_answers, smile: v } }))} />
      <PromptField label="What are they really good at?" placeholder="Building LEGO castles, telling jokes…"
        value={form.personality_answers.good_at}
        onChange={(v) => setForm((f) => ({ ...f, personality_answers: { ...f.personality_answers, good_at: v } }))} />
      <PromptField label="What makes them feel brave?" placeholder="Holding a torch, singing loudly…"
        value={form.personality_answers.brave}
        onChange={(v) => setForm((f) => ({ ...f, personality_answers: { ...f.personality_answers, brave: v } }))} />
      <PromptField label="What are they curious about?" placeholder="Why the sky is blue, how clouds float…"
        value={form.personality_answers.curious}
        onChange={(v) => setForm((f) => ({ ...f, personality_answers: { ...f.personality_answers, curious: v } }))} />

      <div className="pt-2">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/50">
          Choose 3 personality traits ({form.personality_traits.length}/3)
        </p>
        <div className="flex flex-wrap gap-2">
          {TRAITS.map((t) => {
            const active = form.personality_traits.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrait(t)}
                className={
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all " +
                  (active
                    ? "border-star bg-star/20 text-foreground shadow-[0_0_20px_oklch(0.85_0.16_88/0.25)] scale-105"
                    : "border-hairline bg-surface-elevated text-foreground/70 hover:border-lavender/60")
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <NextButton disabled={form.personality_traits.length < 1} onClick={onNext}>Continue</NextButton>
    </ScreenCard>
  );
}

function ScreenFavorites({
  form, update, onNext,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onNext: () => void;
}) {
  return (
    <ScreenCard title="Favourite Things" subtitle="Their world, woven into every story.">
      <IconPicker label="Favourite animal" value={form.favorite_animal} options={FAV_ANIMALS}
        onChange={(v) => update("favorite_animal", v)} />
      <ColorPicker label="Favourite colour" value={form.favorite_color} options={FAV_COLORS}
        onChange={(v) => update("favorite_color", v)} />
      <IconPicker label="Favourite food" value={form.favorite_food} options={FAV_FOODS}
        onChange={(v) => update("favorite_food", v)} />
      <IconPicker label="Favourite toy" value={form.favorite_toy} options={FAV_TOYS}
        onChange={(v) => update("favorite_toy", v)} />
      <IconPicker label="Favourite bedtime story" value={form.favorite_story} options={FAV_STORIES}
        onChange={(v) => update("favorite_story", v)} />
      <IconPicker label="Favourite place" value={form.favorite_place} options={FAV_PLACES}
        onChange={(v) => update("favorite_place", v)} />
      <IconPicker label="Favourite season" value={form.favorite_season} options={FAV_SEASONS}
        onChange={(v) => update("favorite_season", v)} />
      <IconPicker label="Favourite holiday" value={form.favorite_holiday} options={FAV_HOLIDAYS}
        onChange={(v) => update("favorite_holiday", v)} />
      <NextButton onClick={onNext}>Continue</NextButton>
    </ScreenCard>
  );
}

function ScreenLearning({
  form, toggleGoal, onSave, busy,
}: {
  form: FormState;
  toggleGoal: (g: string) => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <ScreenCard
      title="Learning Goals"
      subtitle="Optional — lessons you'd love stories to gently reinforce."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LEARNING_GOALS.map((g) => {
          const active = form.learning_goals.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGoal(g.id)}
              className={
                "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all " +
                (active
                  ? "border-star bg-star/15 shadow-[0_0_25px_oklch(0.85_0.16_88/0.2)] scale-[1.02]"
                  : "border-hairline bg-surface-elevated hover:border-lavender/60")
              }
            >
              <span className="text-3xl">{g.emoji}</span>
              <span className="text-sm font-medium text-foreground">{g.id}</span>
            </button>
          );
        })}
      </div>
      <NextButton onClick={onSave} disabled={busy}>
        {busy ? "Sprinkling stardust…" : "Finish & save adventurer"}
      </NextButton>
    </ScreenCard>
  );
}

function ScreenSuccess({ name, onCreate }: { name: string; onCreate: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div className="max-w-lg">
        <div className="relative mb-8 grid h-40 place-items-center">
          <span className="absolute left-1/4 text-3xl animate-float">⭐</span>
          <span className="absolute right-1/4 top-2 text-2xl animate-float [animation-delay:400ms]">✨</span>
          <span className="absolute left-1/3 bottom-0 text-2xl animate-float [animation-delay:700ms]">☁️</span>
          <span className="absolute right-1/3 bottom-2 text-3xl animate-float [animation-delay:200ms]">🌙</span>
          <div className="grid size-28 place-items-center rounded-full bg-gradient-to-tr from-star/40 to-peach/40 shadow-[0_0_60px_oklch(0.85_0.16_88/0.45)]">
            <span className="text-6xl">✨</span>
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-foreground text-balance">
          {name ? `${name}` : "Your little adventurer"} is ready! ✨
        </h1>
        <p className="mt-4 text-foreground/65 text-balance leading-relaxed">
          Adventure Club now knows enough to create personalised bedtime adventures
          where your child is always the hero.
        </p>
        <button
          onClick={onCreate}
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-[0_24px_60px_-20px_oklch(0.85_0.16_88/0.7)] hover:scale-[1.03] transition-transform"
        >
          Create Tonight's Adventure
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

// ---------- Tiny UI primitives ----------

function ScreenCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-hairline bg-surface/70 p-7 md:p-9 backdrop-blur-xl card-glow">
      <h2 className="font-display text-3xl text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-foreground/55">{subtitle}</p>}
      <div className="mt-7 space-y-5">{children}</div>
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

function PromptField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="mb-2 font-display text-lg text-foreground">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-hairline bg-background/60 px-4 py-3 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
      />
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-2xl border border-hairline bg-background/60 px-4 text-foreground outline-none placeholder:text-foreground/30 focus:border-lavender/60"
    />
  );
}

function ColorPicker({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { id: string; hex: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={
                "group flex items-center gap-2 rounded-full border py-2 pl-2 pr-4 transition-all " +
                (active
                  ? "border-star bg-star/15 scale-105"
                  : "border-hairline bg-surface-elevated hover:border-lavender/60")
              }
            >
              <span className="size-7 rounded-full ring-2 ring-background/40" style={{ background: o.hex }} />
              <span className="text-sm text-foreground/85">{o.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipPicker({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={
                "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all " +
                (active
                  ? "border-star bg-star/15 text-foreground scale-105"
                  : "border-hairline bg-surface-elevated text-foreground/75 hover:border-lavender/60")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconPicker({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={
                "rounded-2xl border px-3.5 py-2.5 text-sm transition-all " +
                (active
                  ? "border-star bg-star/15 scale-105"
                  : "border-hairline bg-surface-elevated hover:border-lavender/60")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center justify-center gap-3 rounded-2xl border p-4 text-sm font-medium transition-all " +
        (active
          ? "border-star bg-star/15 text-foreground scale-[1.02]"
          : "border-hairline bg-surface-elevated text-foreground/65 hover:border-lavender/60")
      }
    >
      {children}
    </button>
  );
}

function NextButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 w-full rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-[0_20px_50px_-20px_oklch(0.85_0.16_88/0.55)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
    >
      {children}
    </button>
  );
}
