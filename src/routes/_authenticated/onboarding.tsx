import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateChildPortrait } from "@/lib/portraits.functions";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Create your adventurer — Adventure Club" }] }),
  component: OnboardingPage,
});

type FormState = {
  first_name: string;
  nickname: string;
  gender: "" | "girl" | "boy";
  date_of_birth: string;
  
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
  { id: "Red", hex: "#ef4444" },
  { id: "Pink", hex: "#ec4899" },
  { id: "Hot Pink", hex: "#f472b6" },
  { id: "Orange", hex: "#f97316" },
  { id: "Yellow", hex: "#facc15" },
  { id: "Lime", hex: "#84cc16" },
  { id: "Mint", hex: "#86efac" },
  { id: "Forest", hex: "#16a34a" },
  { id: "Teal", hex: "#14b8a6" },
  { id: "Sky", hex: "#7dd3fc" },
  { id: "Navy", hex: "#1e3a8a" },
  { id: "Lavender", hex: "#c4b5fd" },
  { id: "Purple", hex: "#a855f7" },
  { id: "Peach", hex: "#fdba74" },
  { id: "Gold", hex: "#fbbf24" },
  { id: "White", hex: "#f8fafc" },
  { id: "Grey", hex: "#94a3b8" },
  { id: "Black", hex: "#1c1917" },
];
const SHOES = ["Sneakers", "Boots", "Sandals", "Wellies", "Slippers", "Magical"];


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

  const [form, setForm] = useState<FormState>({
    first_name: "",
    nickname: "",
    gender: "",
    date_of_birth: "",

    
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


  async function save() {
    if (!user) return;
    if (!form.first_name.trim()) {
      toast.error("Please add your child's name");
      setStep(1);
      return;
    }
    if (!form.gender) {
      toast.error("Please choose girl or boy so stories match perfectly");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const { data: inserted, error } = await supabase
        .from("children")
        .insert({
          user_id: user.id,
          first_name: form.first_name.trim(),
          nickname: form.nickname.trim() || null,
          gender: form.gender,
          date_of_birth: form.date_of_birth || null,
          reference_photo_url: null,
          
          
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
        })
        .select("id")
        .single();
      if (error || !inserted) throw error ?? new Error("Could not create profile");

      // Make the newly created adventurer the active one.
      await supabase
        .from("profiles")
        .update({ active_child_id: inserted.id })
        .eq("id", user.id);

      track("adventurer_created", { child_id: inserted.id });
      // Detect first child: if this insert was their only one, treat as onboarding completion.
      const { count } = await supabase
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) <= 1) {
        track("onboarding_completed", { child_id: inserted.id });
      }

      setStep(6); // success
      void generateChildPortrait({ data: { childId: inserted.id } }).catch((e) => {
        console.error("Portrait generation failed", e);
        toast.message("We'll draw your adventurer's portrait shortly ✨");
      });
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
        {step < 6 && (
          <div className="mb-8 flex items-center gap-2">
            <button
              onClick={() => {
                if (step === 0) {
                  window.history.length > 1 ? window.history.back() : navigate({ to: "/" });
                } else {
                  setStep((s) => Math.max(0, s - 1));
                }
              }}
              className="text-xs text-foreground/55 hover:text-foreground"
            >
              ← Back
            </button>
            {step > 0 && (
              <>
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
              </>
            )}
          </div>
        )}

        <div className="flex-1 animate-slide-up">
          {step === 0 && <ScreenIntro onStart={() => setStep(1)} />}
          {step === 1 && (
            <ScreenBasics
              form={form}
              update={update}
              age={age}
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
          {step === 4 && <ScreenFavorites form={form} setForm={setForm} onNext={() => setStep(5)} />}
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
        <div className="mb-6 flex justify-center gap-3 text-5xl">
          <span className="animate-float">⭐</span>
          <span className="animate-float [animation-delay:300ms]">🌙</span>
          <span className="animate-float [animation-delay:600ms]">☁️</span>
        </div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-star/80">
          🧒 Create Your Adventurer
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground text-balance leading-tight">
          Now let's meet your little hero <span className="text-star">✨</span>
        </h1>
        <p className="mt-5 text-lg text-foreground/65 text-balance leading-relaxed">
          Your Parent Account is ready. Next, let's create the little hero who will
          star in every bedtime adventure — their name, looks, and the things they love.
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
  form, update, age, onNext,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  age: number | null;
  onNext: () => void;
}) {
  const valid = form.first_name.trim().length > 0 && form.gender !== "";
  return (
    <ScreenCard
      title="About your child"
      subtitle="Tell us about your little hero. These details power every story."
    >


      <Field label="Child's first name">
        <Input value={form.first_name} onChange={(v) => update("first_name", v)} placeholder="Natalie" />
      </Field>
      <Field label="Nickname (optional)">
        <Input value={form.nickname} onChange={(v) => update("nickname", v)} placeholder="Little Bear" />
      </Field>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/50">
          Gender <span className="text-foreground/40 normal-case">— guides story wording &amp; illustrations</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "girl", label: "Girl", emoji: "👧" },
            { id: "boy", label: "Boy", emoji: "👦" },
          ] as const).map((g) => {
            const active = form.gender === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => update("gender", g.id)}
                className={
                  "flex items-center justify-center gap-3 rounded-2xl border p-4 text-base font-medium transition-all " +
                  (active
                    ? "border-star bg-star/15 text-foreground scale-[1.02] shadow-[0_0_25px_oklch(0.85_0.16_88/0.2)]"
                    : "border-hairline bg-surface-elevated text-foreground/70 hover:border-lavender/60")
                }
              >
                <span className="text-2xl">{g.emoji}</span>
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

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

      <NextButton onClick={onNext}>Continue</NextButton>
    </ScreenCard>
  );
}

function skinHex(id: string) {
  const t = SKIN_TONES.find((s) => s.id === id);
  return t ? t.hex : "var(--surface)";
}

function hexFrom(list: { id: string; hex: string }[], id: string, fallback: string) {
  return list.find((x) => x.id === id)?.hex ?? fallback;
}

function CartoonFacePreview({ form }: { form: FormState }) {
  const skin = form.skin_tone ? hexFrom(SKIN_TONES, form.skin_tone, "#f5d2a8") : "#f5d2a8";
  const hair = form.hair_color ? hexFrom(HAIR_COLORS, form.hair_color, "#78350f") : "#78350f";
  const eye = form.eye_color ? hexFrom(EYE_COLORS, form.eye_color, "#7c2d12") : "#7c2d12";
  const outfit = form.outfit_color ? hexFrom(OUTFIT_COLORS, form.outfit_color, "#c4b5fd") : "#c4b5fd";
  const style = form.hair_style;

  // Hair shape variations
  let hairShape: React.ReactNode = null;
  if (style === "Long") {
    hairShape = (
      <>
        <path d={`M30 75 Q30 30 100 28 Q170 30 170 75 L170 145 Q170 155 160 155 L150 155 L150 80 Q100 70 50 80 L50 155 L40 155 Q30 155 30 145 Z`} fill={hair} />
        <ellipse cx="100" cy="42" rx="72" ry="32" fill={hair} />
      </>
    );
  } else if (style === "Wavy") {
    hairShape = (
      <path d={`M30 80 Q35 35 70 32 Q85 20 100 30 Q115 20 130 32 Q165 35 170 80 Q160 70 150 78 Q140 60 125 72 Q110 55 100 70 Q90 55 75 72 Q60 60 50 78 Q40 70 30 80 Z`} fill={hair} />
    );
  } else if (style === "Curly") {
    hairShape = (
      <g fill={hair}>
        <ellipse cx="100" cy="40" rx="70" ry="28" />
        {[35, 55, 75, 95, 115, 135, 155, 175].map((cx) => (
          <circle key={`t-${cx}`} cx={cx} cy={28} r={14} />
        ))}
        {[30, 55, 145, 170].map((cx) => (
          <circle key={`s-${cx}`} cx={cx} cy={60} r={14} />
        ))}
        {[28, 172].map((cx) => (
          <circle key={`b-${cx}`} cx={cx} cy={85} r={12} />
        ))}
      </g>
    );
  } else if (style === "Braided") {
    hairShape = (
      <>
        <ellipse cx="100" cy="45" rx="70" ry="30" fill={hair} />
        <path d="M30 70 Q20 110 28 150 L42 150 Q40 110 45 75 Z" fill={hair} />
        <path d="M170 70 Q180 110 172 150 L158 150 Q160 110 155 75 Z" fill={hair} />
        {[80, 105, 130].map((cy) => (
          <g key={cy}>
            <circle cx="32" cy={cy} r="6" fill={hair} stroke="rgba(0,0,0,0.15)" />
            <circle cx="168" cy={cy} r="6" fill={hair} stroke="rgba(0,0,0,0.15)" />
          </g>
        ))}
      </>
    );
  } else if (style === "Buzzed") {
    hairShape = <path d="M35 70 Q35 38 100 35 Q165 38 165 70 L165 78 Q100 70 35 78 Z" fill={hair} opacity={0.9} />;
  } else if (style === "Short") {
    hairShape = <path d="M32 78 Q32 32 100 30 Q168 32 168 78 Q150 55 100 55 Q50 55 32 78 Z" fill={hair} />;
  } else {
    hairShape = <path d="M32 78 Q32 32 100 30 Q168 32 168 78 Q150 55 100 55 Q50 55 32 78 Z" fill={hair} opacity={0.5} />;
  }

  return (
    <svg viewBox="0 0 200 220" className="mx-auto block h-44 w-44" aria-label="Adventurer preview">
      {/* body */}
      <path d={`M50 215 Q50 165 100 160 Q150 165 150 215 Z`} fill={outfit} />
      <rect x="50" y="200" width="100" height="20" fill={outfit} />
      {/* neck */}
      <rect x="88" y="148" width="24" height="18" fill={skin} />
      {/* face */}
      <ellipse cx="100" cy="100" rx="58" ry="62" fill={skin} />
      {/* ears */}
      <ellipse cx="42" cy="105" rx="9" ry="13" fill={skin} />
      <ellipse cx="158" cy="105" rx="9" ry="13" fill={skin} />
      {/* hair */}
      {hairShape}
      {/* eyes */}
      <g>
        <ellipse cx="80" cy="105" rx="9" ry="11" fill="#ffffff" />
        <ellipse cx="120" cy="105" rx="9" ry="11" fill="#ffffff" />
        <circle cx="80" cy="107" r="5.5" fill={eye} />
        <circle cx="120" cy="107" r="5.5" fill={eye} />
        <circle cx="81.5" cy="105" r="1.6" fill="#ffffff" />
        <circle cx="121.5" cy="105" r="1.6" fill="#ffffff" />
      </g>
      {/* eyebrows */}
      <path d="M70 92 Q80 87 90 92" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M110 92 Q120 87 130 92" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* nose */}
      <path d="M100 115 Q97 125 100 130" stroke="rgba(0,0,0,0.25)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* mouth */}
      <path d="M88 140 Q100 150 112 140" stroke="#b91c1c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* freckles */}
      {form.freckles && (
        <g fill="#7c4a2a" opacity={0.75}>
          {[
            [72, 122], [78, 127], [70, 130],
            [122, 127], [128, 122], [130, 130],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.6} />
          ))}
        </g>
      )}
      {/* glasses */}
      {form.glasses && (
        <g stroke="#1f2937" strokeWidth="2.2" fill="none">
          <circle cx="80" cy="106" r="14" />
          <circle cx="120" cy="106" r="14" />
          <path d="M94 106 L106 106" />
          <path d="M66 106 L52 102" />
          <path d="M134 106 L148 102" />
        </g>
      )}
    </svg>
  );
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
  form, setForm, onNext,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
}) {
  function toggleIn<K extends keyof FormState>(key: K, value: string, max?: number) {
    setForm((f) => {
      const arr = (f[key] as unknown as string[]) ?? [];
      if (arr.includes(value)) {
        return { ...f, [key]: arr.filter((x) => x !== value) } as FormState;
      }
      if (max && arr.length >= max) {
        toast.message(`You can pick up to ${max} ✨`);
        return f;
      }
      return { ...f, [key]: [...arr, value] } as FormState;
    });
  }
  return (
    <ScreenCard title="Favourite Things" subtitle="Tap as many as you love — these sprinkle into every story.">
      <PillMultiSelect
        label="Favourite Animals"
        hint="Select up to 5"
        options={FAV_ANIMALS}
        selected={form.favorite_animals}
        onToggle={(v) => toggleIn("favorite_animals", v, 5)}
        onAddCustom={(v) => toggleIn("favorite_animals", v, 5)}
        accent="peach"
      />
      <ColorPillMultiSelect
        label="Favourite Colours"
        hint="Select up to 5"
        options={FAV_COLORS_PILLS}
        selected={form.favorite_colors}
        onToggle={(v) => toggleIn("favorite_colors", v, 5)}
        onAddCustom={(v) => toggleIn("favorite_colors", v, 5)}
      />
      <PillMultiSelect
        label="Favourite Foods"
        hint="Select up to 5"
        options={FAV_FOODS}
        selected={form.favorite_foods}
        onToggle={(v) => toggleIn("favorite_foods", v, 5)}
        onAddCustom={(v) => toggleIn("favorite_foods", v, 5)}
        accent="mint"
      />
      <PillMultiSelect
        label="Favourite Toys"
        hint="Select up to 5"
        options={FAV_TOYS}
        selected={form.favorite_toys}
        onToggle={(v) => toggleIn("favorite_toys", v, 5)}
        onAddCustom={(v) => toggleIn("favorite_toys", v, 5)}
        accent="star"
      />
      <PillMultiSelect
        label="Favourite Story Themes"
        hint="Select as many as you'd like"
        options={FAV_STORY_THEMES}
        selected={form.favorite_story_themes}
        onToggle={(v) => toggleIn("favorite_story_themes", v)}
        onAddCustom={(v) => toggleIn("favorite_story_themes", v)}
        accent="lavender"
      />
      <PillMultiSelect
        label="Favourite Hobbies"
        hint="Select multiple"
        options={FAV_HOBBIES}
        selected={form.favorite_hobbies}
        onToggle={(v) => toggleIn("favorite_hobbies", v)}
        onAddCustom={(v) => toggleIn("favorite_hobbies", v)}
        accent="peach"
      />
      <PillMultiSelect
        label="Favourite Places"
        hint="Select multiple"
        options={FAV_PLACES}
        selected={form.favorite_places}
        onToggle={(v) => toggleIn("favorite_places", v)}
        onAddCustom={(v) => toggleIn("favorite_places", v)}
        accent="mint"
      />
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

type Accent = "peach" | "lavender" | "mint" | "star";

const ACCENT_ACTIVE: Record<Accent, string> = {
  peach: "border-peach bg-peach/25 text-foreground shadow-[0_0_24px_oklch(0.82_0.12_55/0.35)]",
  lavender: "border-lavender bg-lavender/25 text-foreground shadow-[0_0_24px_oklch(0.78_0.13_300/0.35)]",
  mint: "border-mint bg-mint/25 text-foreground shadow-[0_0_24px_oklch(0.85_0.13_165/0.35)]",
  star: "border-star bg-star/25 text-foreground shadow-[0_0_24px_oklch(0.85_0.16_88/0.35)]",
};

function PillMultiSelect({
  label, hint, options, selected, onToggle, onAddCustom, accent = "lavender",
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onAddCustom: (v: string) => void;
  accent?: Accent;
}) {
  const [custom, setCustom] = useState("");
  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    onAddCustom(v);
    setCustom("");
  }
  const customSelected = selected.filter((s) => !options.includes(s));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-display text-lg text-foreground">{label}</p>
        {hint && <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">{hint} · {selected.length}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={
                "rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 " +
                (active
                  ? ACCENT_ACTIVE[accent] + " scale-105"
                  : "border-hairline bg-surface-elevated text-foreground/75 hover:border-lavender/60 hover:bg-surface")
              }
            >
              {o}
            </button>
          );
        })}
        {customSelected.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={"rounded-full border px-4 py-2 text-sm font-medium scale-105 " + ACCENT_ACTIVE[accent]}
          >
            ✨ {o} ×
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Add your own…"
          className="h-10 flex-1 rounded-full border border-dashed border-hairline bg-background/40 px-4 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-lavender/60"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="rounded-full bg-foreground/10 px-4 text-sm font-medium text-foreground/80 hover:bg-foreground/15 disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function ColorPillMultiSelect({
  label, hint, options, selected, onToggle, onAddCustom,
}: {
  label: string;
  hint?: string;
  options: { id: string; hex: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onAddCustom: (v: string) => void;
}) {
  const [custom, setCustom] = useState("");
  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    onAddCustom(v);
    setCustom("");
  }
  const known = new Set(options.map((o) => o.id));
  const customSelected = selected.filter((s) => !known.has(s));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-display text-lg text-foreground">{label}</p>
        {hint && <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">{hint} · {selected.length}</span>}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const active = selected.includes(o.id);
          const isGradient = o.hex.startsWith("linear-gradient");
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={
                "group flex items-center gap-2 rounded-full border py-2 pl-2 pr-4 text-sm transition-all active:scale-95 " +
                (active
                  ? "border-star bg-star/15 text-foreground scale-105 shadow-[0_0_24px_oklch(0.85_0.16_88/0.3)]"
                  : "border-hairline bg-surface-elevated text-foreground/80 hover:border-lavender/60")
              }
            >
              <span
                className="size-7 rounded-full ring-2 ring-background/40"
                style={isGradient ? { backgroundImage: o.hex } : { background: o.hex }}
              />
              <span className="font-medium">{o.id}</span>
            </button>
          );
        })}
        {customSelected.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className="rounded-full border border-star bg-star/15 px-4 py-2 text-sm font-medium scale-105"
          >
            ✨ {o} ×
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Add your own colour…"
          className="h-10 flex-1 rounded-full border border-dashed border-hairline bg-background/40 px-4 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-lavender/60"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="rounded-full bg-foreground/10 px-4 text-sm font-medium text-foreground/80 hover:bg-foreground/15 disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

