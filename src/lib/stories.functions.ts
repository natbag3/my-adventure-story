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

    const systemPrompt = `You are a world-class children's bedtime story author writing for Adventure Club. You write magical, warm, age-appropriate stories in the spirit of Disney and Pixar. The named child is ALWAYS the main character. Weave in their appearance, personality, and favorites so each story feels deeply personal. Keep language age-appropriate, gentle, and imaginative. End with a calming, hopeful note suitable for sleep. You MUST respond with valid JSON only — no markdown, no commentary.`;

    const userPrompt = `Create a personalized bedtime story.

CHILD PROFILE:
${JSON.stringify(profileSummary, null, 2)}

STORY SETTINGS:
- Theme: ${data.theme}
- Mood: ${data.mood}
- Lesson to gently weave in: ${data.lesson}
- Total length: ${data.lengthMinutes} minutes (~${targetWords} words per page)
- Number of pages: ${pageCount}

REQUIREMENTS:
- The main character's name MUST be "${child.first_name}".
- Use 2-4 of their favorites/interests naturally throughout the story.
- Each page should advance the story arc: setup → adventure → challenge → lesson → calming ending.
- The final page should be gentle and sleepy.
- "illustration_prompt" should describe the scene visually and ALWAYS include "${child.first_name}'s" consistent appearance (hair, eyes, outfit) so illustrations stay consistent.

Respond with this exact JSON schema:
{
  "title": "string (short, magical, 3-7 words)",
  "cover_emoji": "single emoji that captures the story",
  "pages": [
    { "text": "string (~${targetWords} words)", "illustration_prompt": "string (scene description with character consistency)" }
  ]
}
The "pages" array MUST have exactly ${pageCount} items.`;

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
