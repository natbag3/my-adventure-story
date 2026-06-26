import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ childId: z.string().uuid() });

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

function cleanList(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x).replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "").trim())
    .filter(Boolean);
}

function genderWord(gender: string | null | undefined, age: number | null): string {
  const g = (gender ?? "").toLowerCase();
  const noun = age != null && age <= 10 ? (g === "boy" ? "boy" : g === "girl" ? "girl" : "child") : (g === "boy" ? "young boy" : g === "girl" ? "young girl" : "child");
  return noun;
}

export const generateChildPortrait = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key is not configured.");

    const { supabase, userId } = context;

    const { data: child, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();
    if (error || !child) throw new Error("Adventurer not found.");

    const age = calcAge(child.date_of_birth);
    const traits = cleanList(child.personality_traits).slice(0, 4).join(", ") || "kind, curious";
    const themes = cleanList(child.favorite_story_themes).slice(0, 3).join(", ");
    const subject = genderWord(child.gender, age);

    const appearance = [
      child.hair_color && `${child.hair_color.toLowerCase()} ${child.hair_style?.toLowerCase() ?? ""} hair`.trim(),
      child.eye_color && `${child.eye_color.toLowerCase()} eyes`,
      child.skin_tone && `${child.skin_tone.toLowerCase()} skin`,
      child.freckles && "soft freckles",
      child.glasses && "round glasses",
      child.outfit_color && `${child.outfit_color.toLowerCase()} outfit`,
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `A friendly Pixar-style children's storybook character portrait of a ${
      age ? `${age}-year-old` : "young"
    } ${subject}, ${appearance || "warm friendly appearance"}. Personality: ${traits}.${
      themes ? ` Loves ${themes}.` : ""
    } Soft warm magical lighting, gentle smile, looking at viewer, head-and-shoulders portrait, centered, painterly Pixar/Disney style, premium children's book illustration, cozy bedtime atmosphere, deep indigo midnight background with subtle glowing stars, consistent protagonist character design suitable for an entire storybook series. No text, no logos, no watermarks.`;

    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`Portrait generation failed: ${aiRes.status} ${txt.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const b64: string | undefined = aiJson?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Portrait generation returned no image.");

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/portraits/${data.childId}.png`;

    const { error: upErr } = await supabase.storage
      .from("adventurer-photos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Could not store portrait: ${upErr.message}`);

    const { error: updErr } = await supabase
      .from("children")
      .update({ portrait_url: path })
      .eq("id", data.childId)
      .eq("user_id", userId);
    if (updErr) throw new Error(`Could not save portrait reference: ${updErr.message}`);

    return { portraitPath: path };
  });
