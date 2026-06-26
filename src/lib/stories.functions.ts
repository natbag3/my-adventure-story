import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  childId: z.string().uuid(),
  theme: z.string().min(1),
  mood: z.string().min(1),
  lesson: z.string().min(1),
  lengthMinutes: z.union([z.literal(3), z.literal(5), z.literal(10)]),
});

const COVER_GRADIENTS: Record<string, string> = {
  bedtime: "from-[oklch(0.35_0.12_260)] via-[oklch(0.28_0.08_280)] to-[oklch(0.22_0.05_295)]",
  funny: "from-[oklch(0.4_0.14_60)] via-[oklch(0.3_0.1_40)] to-[oklch(0.22_0.06_290)]",
  exciting: "from-[oklch(0.38_0.16_25)] via-[oklch(0.3_0.12_15)] to-[oklch(0.22_0.06_290)]",
  heartwarming: "from-[oklch(0.38_0.14_350)] via-[oklch(0.3_0.1_340)] to-[oklch(0.22_0.06_290)]",
  educational: "from-[oklch(0.36_0.12_200)] via-[oklch(0.28_0.09_220)] to-[oklch(0.22_0.06_290)]",
  mystery: "from-[oklch(0.3_0.12_300)] via-[oklch(0.24_0.09_280)] to-[oklch(0.18_0.05_290)]",
};

export const generateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key is not configured.");

    const { supabase, userId } = context;

    // Load child profile
    const { data: child, error: childErr } = await supabase
      .from("children")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();
    if (childErr || !child) throw new Error("Adventurer not found.");

    // Age
    let age: number | null = null;
    if (child.date_of_birth) {
      const d = new Date(child.date_of_birth);
      const now = new Date();
      age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    }

    const pageCount = data.lengthMinutes === 3 ? 8 : data.lengthMinutes === 5 ? 12 : 18;

    const profileSummary = {
      name: child.first_name,
      nickname: child.nickname ?? undefined,
      age,
      appearance: {
        hair_color: child.hair_color,
        hair_style: child.hair_style,
        eye_color: child.eye_color,
        skin_tone: child.skin_tone,
        freckles: child.freckles,
        glasses: child.glasses,
        outfit_color: child.outfit_color,
        shoes: child.shoes,
      },
      personality_traits: child.personality_traits,
      favorite_animals: child.favorite_animals,
      favorite_colors: child.favorite_colors,
      favorite_foods: child.favorite_foods,
      favorite_toys: child.favorite_toys,
      favorite_places: child.favorite_places,
      favorite_hobbies: child.favorite_hobbies,
      favorite_story_themes: child.favorite_story_themes,
      learning_goals: child.learning_goals,
    };

    const systemPrompt = `You are a world-class children's picture book author for Adventure Club, writing in the rhythm and style of Julia Donaldson (The Gruffalo, Room on the Broom) and Lynley Dodd (Hairy Maclary). You craft magical, gently rhyming bedtime picture books — short, lyrical, easy to read aloud. The named child is ALWAYS the hero. You silently follow a two-stage process and only return the final story as valid JSON. No markdown. No commentary.`;

    const userPrompt = `Write a personalised rhyming bedtime picture book.

CHILD PROFILE:
${JSON.stringify(profileSummary, null, 2)}

STORY SETTINGS:
- Theme: ${data.theme}
- Mood: ${data.mood}
- Gentle lesson to weave in: ${data.lesson}
- Length: ${data.lengthMinutes} minutes → exactly ${pageCount} pages

═══════════════════════════════════════════
STAGE 1 — SILENT BLUEPRINT (do NOT output)
═══════════════════════════════════════════
Internally plan the arc before writing:
  1. Beginning — ${child.first_name} enters a magical world.
  2. Three magical discoveries or events.
  3. One gentle challenge or problem.
  4. Resolution of the challenge.
  5. Calm bedtime ending — return home, drift to sleep.

═══════════════════════════════════════════
STAGE 2 — FINAL STORY (the only thing you output)
═══════════════════════════════════════════
WRITING STYLE:
- Every page MUST rhyme naturally (AABB, ABAB, or couplets) — never forced.
- Short, lyrical lines with a clear sing-song rhythm.
- Maximum 2–3 sentences per page. HARD CAP: 60 words per page.
- One clear idea per page. No long paragraphs.
- Simple vocabulary suitable for ages 3–7.
- Warm, gentle, magical tone — never scary, dark, or abrupt.

STRUCTURE across ${pageCount} pages:
- Page 1: Introduce ${child.first_name} and the magical setting.
- Middle pages: The three magical discoveries unfold, then the gentle problem.
- Penultimate page: The problem is gently solved.
- Final page: Calm return home, peaceful, sleepy ending.

HERO RULES:
- ${child.first_name} is the main character on every page.
- Use their name naturally in the rhyme.
- Weave in 2–4 of their favourites/personality traits where they fit.

ILLUSTRATION PROMPTS:
- Pure visual description — no storytelling words.
- Pixar-style children's picture book illustration.
- ALWAYS describe ${child.first_name}'s consistent appearance (hair, eyes, outfit) so the character looks identical across every page.

═══════════════════════════════════════════
STAGE 3 — SILENT SELF-CHECK (do NOT output)
═══════════════════════════════════════════
Before returning, silently verify:
  ✓ Every page rhymes naturally
  ✓ Every page is ≤ 60 words
  ✓ Language is gentle and age-appropriate
  ✓ Reads aloud beautifully
  ✓ ${child.first_name} is the hero on every page
  ✓ Story follows the blueprint arc
If ANY check fails, silently rewrite before responding.

═══════════════════════════════════════════
OUTPUT — VALID JSON ONLY, this exact shape:
═══════════════════════════════════════════
{
  "title": "short magical title (3–6 words)",
  "cover_emoji": "single emoji capturing the story",
  "pages": [
    { "page_number": 1, "text": "rhyming page text ≤60 words", "illustration_prompt": "visual scene with ${child.first_name}'s consistent appearance" }
  ]
}
The "pages" array MUST contain exactly ${pageCount} items, numbered 1 to ${pageCount}.`;

    // OpenAI Chat Completions API
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Too many adventures right now. Please try again in a moment.");
      if (aiRes.status === 401) throw new Error("OpenAI API key is invalid. Please check your configuration.");
      if (aiRes.status === 402 || aiRes.status === 403) throw new Error("OpenAI quota exhausted. Please check your billing.");
      throw new Error(`AI request failed: ${aiRes.status} ${txt.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: { title: string; cover_emoji?: string; pages: Array<{ text: string; illustration_prompt: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("The AI returned an invalid story format. Please try again.");
    }

    if (!parsed.title || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw new Error("The AI returned an incomplete story. Please try again.");
    }

    const coverGradient = COVER_GRADIENTS[data.mood.toLowerCase()] ?? COVER_GRADIENTS.bedtime;

    // Save to DB (RLS: own user)
    const { data: inserted, error: insErr } = await supabase
      .from("stories")
      .insert({
        user_id: userId,
        child_id: data.childId,
        title: parsed.title,
        theme: data.theme,
        mood: data.mood,
        lesson: data.lesson,
        length_minutes: data.lengthMinutes,
        cover_emoji: parsed.cover_emoji || "✨",
        cover_gradient: coverGradient,
        pages: parsed.pages,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error("Could not save the story. Please try again.");

    return { storyId: inserted.id as string };
  });
