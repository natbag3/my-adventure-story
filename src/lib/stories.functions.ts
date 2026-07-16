import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { zoneForTheme } from "@/lib/worlds";

const GenerateInput = z.object({
  childId: z.string().uuid(),
  coStarIds: z.array(z.string().uuid()).optional().default([]),
  petIds: z.array(z.string().uuid()).optional().default([]),
  theme: z.string().min(1),
  mood: z.string().min(1),
  lesson: z.string().min(1),
  lengthMinutes: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  seriesId: z.string().uuid().optional().nullable(),
  newSeries: z
    .object({
      title: z.string().min(1).max(80),
      worldDescription: z.string().min(1).max(500),
      totalParts: z.number().int().min(2).max(20).optional().default(5),
    })
    .optional()
    .nullable(),
});

const COVER_GRADIENTS: Record<string, string> = {
  bedtime: "from-[oklch(0.35_0.12_260)] via-[oklch(0.28_0.08_280)] to-[oklch(0.22_0.05_295)]",
  funny: "from-[oklch(0.4_0.14_60)] via-[oklch(0.3_0.1_40)] to-[oklch(0.22_0.06_290)]",
  exciting: "from-[oklch(0.38_0.16_25)] via-[oklch(0.3_0.12_15)] to-[oklch(0.22_0.06_290)]",
  heartwarming: "from-[oklch(0.38_0.14_350)] via-[oklch(0.3_0.1_340)] to-[oklch(0.22_0.06_290)]",
  educational: "from-[oklch(0.36_0.12_200)] via-[oklch(0.28_0.09_220)] to-[oklch(0.22_0.06_290)]",
  mystery: "from-[oklch(0.3_0.12_300)] via-[oklch(0.24_0.09_280)] to-[oklch(0.18_0.05_290)]",
};

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function summariseChild(child: Record<string, unknown>) {
  return {
    name: child.first_name,
    nickname: child.nickname ?? undefined,
    gender: child.gender ?? undefined,
    age: calcAge(child.date_of_birth as string | null),
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
}

export const generateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI key is not configured.");


    const { supabase, userId } = context;

    const allIds = Array.from(new Set([data.childId, ...data.coStarIds]));
    const { data: kids, error: childErr } = await supabase
      .from("children")
      .select("*")
      .in("id", allIds)
      .eq("user_id", userId);
    if (childErr || !kids || kids.length === 0) throw new Error("Adventurer not found.");

    const primary = kids.find((k) => k.id === data.childId);
    if (!primary) throw new Error("Adventurer not found.");
    const coStars = kids.filter((k) => k.id !== data.childId);

    const heroNames = [primary.first_name, ...coStars.map((c) => c.first_name)];
    const heroLabel =
      heroNames.length === 1
        ? heroNames[0]
        : heroNames.length === 2
        ? `${heroNames[0]} and ${heroNames[1]}`
        : `${heroNames.slice(0, -1).join(", ")}, and ${heroNames[heroNames.length - 1]}`;

    const pageCount = data.lengthMinutes === 3 ? 4 : data.lengthMinutes === 5 ? 6 : 8;

    let pets: Array<{ name: string; type: string; fur_color: string | null; eye_color: string | null }> = [];
    if (data.petIds.length > 0) {
      const { data: petRows } = await supabase
        .from("pets")
        .select("name, type, fur_color, eye_color")
        .in("id", data.petIds)
        .eq("user_id", userId);
      pets = petRows ?? [];
    }

    const profile = {
      primary_hero: summariseChild(primary),
      co_stars: coStars.map(summariseChild),
      pet_sidekicks: pets,
    };

    // Fetch story universe: past summaries + world notes
    const { data: recentStories } = await supabase
      .from("stories")
      .select("story_summary, created_at")
      .eq("child_id", data.childId)
      .eq("user_id", userId)
      .not("story_summary", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);
    const pastSummaries = (recentStories ?? [])
      .map((s) => (s as { story_summary: string | null }).story_summary)
      .filter((s): s is string => !!s);
    const worldNotes = (primary as { world_notes?: string | null }).world_notes ?? null;

    const universeSection =
      pastSummaries.length > 0 || worldNotes
        ? `\nSTORY UNIVERSE & MEMORIES (use subtly — story must work standalone):
${worldNotes ? worldNotes + "\n" : ""}${pastSummaries.length > 0 ? `Recent adventures ${primary.first_name} remembers:\n${pastSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n` : ""}Weave in 1–2 gentle callbacks to past events where natural — "remember when…", a familiar character reappearing, or returning to a known place. Never retell past stories, just hint at shared history.\n`
        : "";

    // Resolve or create the series (if any), and figure out which part number this is
    type SeriesRow = {
      id: string;
      title: string;
      total_parts: number;
      current_part: number;
      world_description: string;
    };
    let series: SeriesRow | null = null;
    let seriesPart: number | null = null;
    let isFinalPart = false;

    if (data.newSeries) {
      const { data: created, error: seriesErr } = await supabase
        .from("story_series")
        .insert({
          user_id: userId,
          child_id: data.childId,
          title: data.newSeries.title,
          world_description: data.newSeries.worldDescription,
          total_parts: data.newSeries.totalParts ?? 5,
          current_part: 1,
        })
        .select("id, title, total_parts, current_part, world_description")
        .single();
      if (seriesErr || !created) throw new Error("Could not start the series.");
      series = created as SeriesRow;
      seriesPart = 1;
      isFinalPart = series.total_parts === 1;
    } else if (data.seriesId) {
      const { data: existing } = await supabase
        .from("story_series")
        .select("id, title, total_parts, current_part, world_description")
        .eq("id", data.seriesId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) throw new Error("Series not found.");
      series = existing as SeriesRow;
      seriesPart = Math.min(series.current_part, series.total_parts);
      isFinalPart = seriesPart >= series.total_parts;
    }

    const seriesSection = series
      ? `\nSERIES CONTEXT — This is Part ${seriesPart} of ${series.total_parts} in the series "${series.title}".
Established series world (keep consistent with previous parts):
${series.world_description}

${
  isFinalPart
    ? `THIS IS THE FINAL PART. Wrap the series with a warm, satisfying conclusion — resolve the ongoing thread and give a full sense of closure on the final page.`
    : `THIS IS NOT THE FINAL PART. End the story on a gentle cliffhanger — the final page should NOT fully resolve. Instead close on a note of curiosity, wonder, or anticipation that hints at what comes next. Example tone: "But just as they were about to leave, they spotted something glowing behind the waterfall…" Keep it warm and bedtime-safe — curiosity, not fear.`
}
`
      : "";


    const systemPrompt = `You are a world-class children's picture book author for Adventure Club, writing in the rhythm and style of Julia Donaldson (The Gruffalo, Room on the Broom) and Lynley Dodd (Hairy Maclary). You craft magical, gently rhyming bedtime picture books — short, lyrical, easy to read aloud. The named child(ren) are ALWAYS the heroes. You silently follow a two-stage process and only return the final story as valid JSON. No markdown. No commentary.`;

    const multiNote =
      coStars.length > 0
        ? `\nMULTI-HERO STORY: ${heroLabel} go on this adventure TOGETHER. Each child appears on most pages, with their own moments to shine. Use each child's gender pronouns correctly (girl → she/her, boy → he/him). Keep every child's appearance and personality consistent across pages.\n`
        : "";

    const petNote =
      pets.length > 0
        ? `\nPET SIDEKICK(S): ${pets
            .map((p) => `${p.name} the ${p.fur_color ?? ""} ${p.type}${p.eye_color ? ` with ${p.eye_color} eyes` : ""}`.replace(/\s+/g, " ").trim())
            .join(", ")} join${pets.length === 1 ? "s" : ""} the adventure as a loyal sidekick. Include the pet by name on most pages. Keep the pet's fur colour and eye colour consistent in every illustration. The pet is a sidekick — never the main hero.\n`
        : "";


    const userPrompt = `Write a personalised rhyming bedtime picture book.

HERO PROFILE(S):
${JSON.stringify(profile, null, 2)}
${multiNote}${petNote}${universeSection}${seriesSection}
STORY SETTINGS:
- Theme: ${data.theme}
- Mood: ${data.mood}
- Gentle lesson to weave in: ${data.lesson}
- Length: ${data.lengthMinutes} minutes → exactly ${pageCount} pages

═══════════════════════════════════════════
STAGE 1 — SILENT BLUEPRINT (do NOT output)
═══════════════════════════════════════════
Internally plan a proper 5-part narrative arc BEFORE writing. Every story MUST follow this shape across its ${pageCount} pages:

  1. OPENING (first 1–2 pages) — Hook the reader immediately. Vary the opening style between stories, choosing ONE of:
       • IN MEDIA RES — drop straight into a moment of action or discovery, as if the adventure has already begun.
       • ATMOSPHERE FIRST — paint the world with vivid, sensory language before the hero appears.
       • A MYSTERY OR QUESTION — something unexplained that makes the child lean in.
       • A SOUND, FEELING OR SIGHT — one striking sensory detail that sets the tone.
     ${heroLabel}'s name must appear naturally within the first two lines. NEVER describe the main character's physical appearance (hair, eyes, skin, outfit) in the story text — the illustrations handle that. Personality and feelings are welcome.
  2. THE PROBLEM OR QUEST (next 2–3 pages) — Something happens that kicks off the adventure: a challenge appears, something is lost, a creature needs help, a mystery begins. It should feel exciting and raise a clear question: what will happen next?
  3. RISING ACTION WITH OBSTACLES (middle pages) — ${heroLabel} tr${heroNames.length > 1 ? "y" : "ies"} to solve the problem but face${heroNames.length > 1 ? "" : "s"} at least 2–3 setbacks, surprises, or discoveries. Each page should BUILD — tension, wonder, or stakes increasing. Every character met or place visited must add something meaningful to the plot.
  4. CLIMAX (1–2 pages near the end) — The biggest moment. ${heroLabel} face${heroNames.length > 1 ? "" : "s"} the main challenge head-on and must use what ${heroNames.length > 1 ? "they have" : "they have"} learned or discovered along the way to overcome it. This is the most exciting or emotional beat.
  5. RESOLUTION & LESSON (final 1–2 pages) — The problem is solved, the quest complete. The lesson (${data.lesson}) emerges NATURALLY from what happened — never stated bluntly, always shown through the outcome. End warmly and satisfyingly, leaving the child feeling safe and happy.

═══════════════════════════════════════════
STAGE 2 — FINAL STORY (the only thing you output)
═══════════════════════════════════════════
WRITING STYLE:
- Every page MUST rhyme naturally (AABB, ABAB, or couplets) — never forced.
- Short, lyrical lines with a clear sing-song rhythm.
- Maximum 2–3 sentences per page. HARD CAP: 60 words per page.
- One clear idea per page. No long paragraphs.
- Use correct gendered pronouns for each hero based on their "gender" field.
- Rhyming couplets should CARRY THE EMOTION of the moment — tense, punchy rhymes for exciting/action beats; gentle, flowing rhymes for the resolution and quiet moments.
- Vary the pace: short punchy lines for action and climax; longer flowing lines for emotional or reflective moments.

NARRATIVE RULES (STRICT):
- Every page MUST move the plot forward — NO filler pages that only describe scenery or feelings without progressing the story.
- Any character introduced early MUST reappear or matter later — no throwaway characters.
- Use CALLBACKS: if something is mentioned or set up on an early page, refer back to it near the end so the story feels whole.
- The obstacles in the middle must escalate — each setback bigger or more surprising than the last, leading naturally into the climax.
- The climax must feel earned — ${heroLabel} solve${heroNames.length > 1 ? "" : "s"} it using something established earlier in the story, not a random new idea.

LANGUAGE SAFETY (STRICT — bedtime-safe only):
- Use ONLY simple children's vocabulary suitable for ages 3–7.
- NO adult words, complex emotional vocabulary, mature themes, or philosophical/abstract language.
- NO scary, violent, dark, sad, lonely, frightening, or unsettling phrasing. No death, fear, anger, monsters chasing, getting lost alone, crying, danger, weapons.
- NO words like: terrified, anxious, depressed, devastated, betrayal, conflict, struggle, despair, demon, evil, dead, kill, hurt, blood.
- Replace any tricky word with a warm, friendly, gentle alternative (e.g. "afraid" → "a little unsure", "angry" → "grumpy", "scary" → "silly").
- Warm, cozy, calming, magical tone throughout, even at the climax — tension should come from stakes and wonder, never from fear.
- If ANY adult or complex word slips in during drafting, silently rewrite that line before output.

STRUCTURE across ${pageCount} pages (map the 5-part arc to these pages):
- Page 1${pageCount >= 6 ? "–2" : ""}: OPENING — hook with action, atmosphere, mystery or a striking sensory detail; ${heroLabel}'s name appears within the first two lines; do NOT describe physical appearance.
- Next 2–3 pages: THE PROBLEM/QUEST kicks in, then RISING ACTION with escalating obstacles.
- Penultimate page (or the one before): CLIMAX — the biggest, most exciting moment.
- Final page: ${
      series && !isFinalPart
        ? `RESOLUTION with a gentle bedtime-safe cliffhanger — the immediate problem eases, but hint at something new to discover next time. Curiosity, not fear. Do NOT fully resolve the larger series thread.`
        : `RESOLUTION — problem solved, lesson shown (not told), calm return home, peaceful sleepy ending.`
    }


HERO RULES:
- ${heroLabel} ${heroNames.length > 1 ? "are" : "is"} the main character${heroNames.length > 1 ? "s" : ""} on every page.
- Use ${heroNames.length > 1 ? "their names" : "their name"} naturally in the rhyme.
- Weave in 2–4 of their favourites/personality traits where they fit.

ILLUSTRATION PROMPTS:
- Pure visual description — no storytelling words.
- Pixar-style children's picture book illustration.
- ALWAYS describe each hero's consistent appearance (gender, hair, eyes, outfit) on every page so the character${heroNames.length > 1 ? "s look" : " looks"} identical across the whole book.

═══════════════════════════════════════════
STAGE 3 — SILENT SELF-CHECK (do NOT output)
═══════════════════════════════════════════
Before returning, silently verify:
  ✓ Every page rhymes naturally
  ✓ Every page is ≤ 60 words
  ✓ Language is gentle and age-appropriate
  ✓ Reads aloud beautifully
  ✓ ${heroLabel} ${heroNames.length > 1 ? "are heroes" : "is the hero"} on every page
  ✓ Pronouns match each hero's gender
  ✓ Story follows the 5-part arc: opening → problem/quest → rising action with 2–3 escalating obstacles → climax → resolution
  ✓ Every page moves the plot forward — no filler pages
  ✓ Characters introduced early reappear or matter later
  ✓ At least one callback ties the ending back to something set up earlier
  ✓ The climax is resolved using something established earlier, not a random new idea
  ✓ The lesson is shown through the outcome, never stated bluntly
  ✓ Rhyme pace matches emotion — punchy for action, flowing for calm moments
If ANY check fails, silently rewrite before responding.

═══════════════════════════════════════════
OUTPUT — VALID JSON ONLY, this exact shape:
═══════════════════════════════════════════
{
  "title": "short magical title (3–6 words)",
  "cover_emoji": "single emoji capturing the story",
  "pages": [
    { "page_number": 1, "text": "rhyming page text ≤60 words", "illustration_prompt": "visual scene with each hero's consistent appearance" }
  ]
}
The "pages" array MUST contain exactly ${pageCount} items, numbered 1 to ${pageCount}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");

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

    const { data: inserted, error: insErr } = await supabase
      .from("stories")
      .insert({
        user_id: userId,
        child_id: data.childId,
        co_star_ids: coStars.map((c) => c.id),
        title: parsed.title,
        theme: data.theme,
        mood: data.mood,
        lesson: data.lesson,
        length_minutes: data.lengthMinutes,
        cover_emoji: parsed.cover_emoji || "✨",
        cover_gradient: coverGradient,
        pages: parsed.pages,
        series_id: series?.id ?? null,
        series_part: seriesPart,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error("Could not save the story. Please try again.");

    // Mark the corresponding world zone visited on the child (best-effort).
    try {
      const zone = zoneForTheme(data.theme);
      if (zone) {
        const current = (primary as { visited_worlds?: string[] | null }).visited_worlds ?? [];
        if (!current.includes(zone.id)) {
          await supabase
            .from("children")
            .update({ visited_worlds: [...current, zone.id] })
            .eq("id", data.childId)
            .eq("user_id", userId);
        }
      }
    } catch {
      // non-fatal
    }

    // Advance the series counter (best-effort)
    if (series && seriesPart) {
      const nextPart = Math.min(seriesPart + 1, series.total_parts);
      await supabase
        .from("story_series")
        .update({ current_part: nextPart })
        .eq("id", series.id)
        .eq("user_id", userId);
    }

    // Second AI call: generate story_summary + world_notes_update (best-effort, non-fatal)
    try {
      const storyText = parsed.pages.map((p) => p.text).join("\n\n");
      const recapRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You summarise children's stories for continuity across a child's story universe. Return VALID JSON only, no markdown.",
            },
            {
              role: "user",
              content: `Story title: ${parsed.title}
Child: ${primary.first_name}
Current world notes: ${worldNotes ?? "(none yet)"}

Story text:
${storyText}

Return a JSON object with exactly these two fields:
{
  "story_summary": "2-3 sentences capturing key events, any new characters or places introduced, and what ${primary.first_name} discovered or learned.",
  "world_notes_update": "1-2 sentences describing any NEW permanent additions to ${primary.first_name}'s universe from this story (e.g. a magical forest they discovered, a dragon friend they made, a recurring character). Empty string if nothing new/permanent was introduced."
}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (recapRes.ok) {
        const recapJson = await recapRes.json();
        const recapContent: string = recapJson?.choices?.[0]?.message?.content ?? "";
        const recap = JSON.parse(recapContent) as {
          story_summary?: string;
          world_notes_update?: string;
        };
        if (recap.story_summary) {
          await supabase
            .from("stories")
            .update({ story_summary: recap.story_summary })
            .eq("id", inserted.id)
            .eq("user_id", userId);
        }
        if (recap.world_notes_update && recap.world_notes_update.trim()) {
          const nextNotes = worldNotes
            ? `${worldNotes}\n${recap.world_notes_update.trim()}`
            : recap.world_notes_update.trim();
          await supabase
            .from("children")
            .update({ world_notes: nextNotes })
            .eq("id", data.childId)
            .eq("user_id", userId);
        }
      }
    } catch {
      // Non-fatal: story is saved even if recap fails
    }

    return { storyId: inserted.id as string };
  });
