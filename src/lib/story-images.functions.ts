import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  storyId: z.string().uuid(),
  pageIndex: z.number().int().min(0),
});

type PageObj = {
  text?: string;
  illustration_prompt?: string;
  image_url?: string | null;
  [k: string]: unknown;
};

function describeChild(child: {
  first_name: string;
  gender?: string | null;
  hair_color?: string | null;
  hair_style?: string | null;
  eye_color?: string | null;
  skin_tone?: string | null;
  freckles?: boolean | null;
  glasses?: boolean | null;
  outfit_color?: string | null;
}) {
  const subject =
    (child.gender ?? "").toLowerCase() === "boy"
      ? "boy"
      : (child.gender ?? "").toLowerCase() === "girl"
      ? "girl"
      : "child";
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

export const generateStoryPageImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key is not configured.");
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
      .select("id, first_name, gender, hair_color, hair_style, eye_color, skin_tone, freckles, glasses, outfit_color")
      .in("id", heroIds);
    const orderedKids = heroIds
      .map((id) => (kids ?? []).find((k) => k.id === id))
      .filter(Boolean) as NonNullable<typeof kids>;

    const heroDescriptions = orderedKids.map(describeChild).join("; ");
    const sceneDesc = page.illustration_prompt || page.text || "magical bedtime scene";

    const prompt = `Pixar-style children's picture book illustration. Scene: ${sceneDesc}. ${
      heroDescriptions ? `Heroes featured: ${heroDescriptions}. Keep every character design consistent across pages.` : ""
    } Warm magical lighting, soft painterly Pixar/Disney style, gentle bedtime atmosphere, premium children's book art, no text, no logos, no watermarks.`;

    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size: "1024x1024", quality: "low", n: 1 }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`Illustration generation failed: ${aiRes.status} ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const b64: string | undefined = aiJson?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Illustration generation returned no image.");

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/stories/${data.storyId}/${data.pageIndex}.png`;
    const { error: upErr } = await supabase.storage
      .from("adventurer-photos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Could not store illustration: ${upErr.message}`);

    const nextPages = pages.map((p, i) => (i === data.pageIndex ? { ...p, image_url: path } : p));
    const { error: updErr } = await supabase
      .from("stories")
      .update({ pages: nextPages as unknown as never })
      .eq("id", data.storyId)
      .eq("user_id", userId);
    if (updErr) throw new Error(`Could not save illustration reference: ${updErr.message}`);

    return { imagePath: path };
  });
