import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  storyId: z.string().uuid(),
  pageIndex: z.number().int().min(0),
});

const CoverInput = z.object({
  storyId: z.string().uuid(),
});

type PageObj = {
  text?: string;
  illustration_prompt?: string;
  image_url?: string | null;
  [k: string]: unknown;
};

type ChildLike = {
  first_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  hair_color?: string | null;
  hair_style?: string | null;
  eye_color?: string | null;
  skin_tone?: string | null;
  freckles?: boolean | null;
  glasses?: boolean | null;
  outfit_color?: string | null;
};

function calcAgeYears(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function subjectNoun(gender?: string | null): "girl" | "boy" | "child" {
  const g = (gender ?? "").toLowerCase();
  return g === "boy" ? "boy" : g === "girl" ? "girl" : "child";
}

function describeChild(child: ChildLike) {
  const subject = subjectNoun(child.gender);
  const traits = [
    child.hair_color && `${child.hair_color.toLowerCase()} ${child.hair_style?.toLowerCase() ?? ""} hair`.trim(),
    child.eye_color && `${child.eye_color.toLowerCase()} eyes`,
    child.skin_tone && `${child.skin_tone.toLowerCase()} skin`,
    child.freckles && "soft freckles",
    child.glasses && "round glasses",
    child.outfit_color && `${child.outfit_color.toLowerCase()} outfit`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${child.first_name} (a ${subject}${traits ? `, ${traits}` : ""})`;
}

function characterReference(child: ChildLike): string {
  const age = calcAgeYears(child.date_of_birth);
  const subject = subjectNoun(child.gender);
  const hair = [child.hair_style?.toLowerCase(), child.hair_color?.toLowerCase()]
    .filter(Boolean)
    .join(" ");
  const parts: string[] = [];
  if (hair) parts.push(`${hair} hair`);
  if (child.eye_color) parts.push(`${child.eye_color.toLowerCase()} eyes`);
  if (child.skin_tone) parts.push(`${child.skin_tone.toLowerCase()} skin`);
  if (child.freckles) parts.push("soft freckles");
  if (child.glasses) parts.push("round glasses");
  const ageStr = age !== null ? `${age}-year-old ` : "";
  const traits = parts.length ? ` with ${parts.join(", ")}` : "";
  const outfit = child.outfit_color
    ? `, wearing a ${child.outfit_color.toLowerCase()} outfit`
    : "";
  return `The main character is ${child.first_name}, a ${ageStr}${subject}${traits}${outfit}.`;
}

const STYLE_PREFIX =
  "Beatrix Potter style children's storybook illustration, soft watercolour painting, warm muted tones, hand-painted brushstrokes, gentle and whimsical, picture book art — ";

const STYLE_ANCHOR =
  "Consistent children's storybook illustration style, warm painterly art, same character design throughout.";

const NEGATIVE_SUFFIX =
  ", avoiding: photorealistic, 3D render, CGI, digital art, sharp harsh edges, modern, neon, anime, cartoon";


export const generateStoryPageImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) throw new Error("FAL API key is not configured.");
    const { supabase, userId } = context;

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, pages, child_id, co_star_ids")
      .eq("id", data.storyId)
      .eq("user_id", userId)
      .single();
    if (error || !story) throw new Error("Story not found.");

    const pages = (story.pages as PageObj[]) ?? [];
    const page = pages[data.pageIndex];
    if (!page) throw new Error("Page not found.");
    if (page.image_url) return { imagePath: page.image_url as string };

    const heroIds = [story.child_id, ...((story.co_star_ids as string[] | null) ?? [])];
    const { data: kids } = await supabase
      .from("children")
      .select("id, first_name, date_of_birth, gender, hair_color, hair_style, eye_color, skin_tone, freckles, glasses, outfit_color")
      .in("id", heroIds);
    const orderedKids = heroIds
      .map((id) => (kids ?? []).find((k) => k.id === id))
      .filter(Boolean) as NonNullable<typeof kids>;

    const heroDescriptions = orderedKids.map(describeChild).join("; ");
    const mainCharacter = orderedKids[0] ? characterReference(orderedKids[0]) : "";
    const sceneDesc = page.illustration_prompt || page.text || "magical bedtime scene";

    const prompt = `${STYLE_PREFIX}${mainCharacter} Maintain this exact character appearance consistently. Pixar-style children's picture book illustration. Scene: ${sceneDesc}. ${
      heroDescriptions ? `Heroes featured: ${heroDescriptions}. Keep every character design consistent across pages.` : ""
    } Warm magical lighting, soft painterly Pixar/Disney style, gentle bedtime atmosphere, premium children's book art, no text, no logos, no watermarks. ${STYLE_ANCHOR}${NEGATIVE_SUFFIX}`;


    const aiRes = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
      body: JSON.stringify({ prompt, image_size: "landscape_4_3", num_images: 1 }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`Illustration generation failed: ${aiRes.status} ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const imageUrl: string | undefined = aiJson?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Illustration generation returned no image.");
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Could not download illustration: ${imgRes.status}`);
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const path = `${userId}/stories/${data.storyId}/${data.pageIndex}.png`;
    const { error: upErr } = await supabase.storage
      .from("adventurer-photos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Could not store illustration: ${upErr.message}`);

    const { error: updErr } = await supabase.rpc(
      "set_story_page_image_url" as never,
      { p_story_id: data.storyId, p_page_index: data.pageIndex, p_image_url: path } as never,
    );
    if (updErr) throw new Error(`Could not save illustration reference: ${updErr.message}`);

    return { imagePath: path };
  });

export const generateStoryCoverImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CoverInput.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) throw new Error("FAL API key is not configured.");
    const { supabase, userId } = context;

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, title, theme, mood, cover_url, child_id, co_star_ids")
      .eq("id", data.storyId)
      .eq("user_id", userId)
      .single();
    if (error || !story) throw new Error("Story not found.");
    if (story.cover_url) return { coverPath: story.cover_url as string };

    const heroIds = [story.child_id, ...((story.co_star_ids as string[] | null) ?? [])];
    const { data: kids } = await supabase
      .from("children")
      .select("id, first_name, date_of_birth, gender, hair_color, hair_style, eye_color, skin_tone, freckles, glasses, outfit_color")
      .in("id", heroIds);
    const orderedKids = heroIds
      .map((id) => (kids ?? []).find((k) => k.id === id))
      .filter(Boolean) as NonNullable<typeof kids>;
    const heroDescriptions = orderedKids.map(describeChild).join("; ");
    const mainCharacter = orderedKids[0] ? characterReference(orderedKids[0]) : "";

    const prompt = `${STYLE_PREFIX}${mainCharacter} Maintain this exact character appearance consistently. A storybook cover illustration titled "${story.title}". Scene: ${
      heroDescriptions ? `${heroDescriptions} on an adventure in ${story.theme.toLowerCase()}.` : `A magical ${story.theme.toLowerCase()} adventure.`
    } ${story.mood ? `${story.mood} atmosphere.` : ""} Warm painterly Pixar/Disney children's book cover style, hero centered and heroic, rich background world, cinematic lighting, portrait orientation, no text, no title, no logos, no watermarks. ${STYLE_ANCHOR}${NEGATIVE_SUFFIX}`;


    const aiRes = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
      body: JSON.stringify({ prompt, image_size: "portrait_4_3", num_images: 1 }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`Cover generation failed: ${aiRes.status} ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const imageUrl: string | undefined = aiJson?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Cover generation returned no image.");
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Could not download cover: ${imgRes.status}`);
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const path = `${userId}/stories/${data.storyId}/cover.png`;
    const { error: upErr } = await supabase.storage
      .from("adventurer-photos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Could not store cover: ${upErr.message}`);

    const { error: updErr } = await supabase.rpc(
      "set_story_cover_url" as never,
      { p_story_id: data.storyId, p_cover_url: path } as never,
    );
    if (updErr) throw new Error(`Could not save cover reference: ${updErr.message}`);

    return { coverPath: path };
  });
