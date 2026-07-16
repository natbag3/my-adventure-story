import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharedStoryPage = {
  text: string;
  image_url: string | null;
};

export type SharedStory = {
  id: string;
  title: string;
  theme: string;
  mood: string;
  lesson: string;
  length_minutes: number;
  cover_emoji: string;
  cover_url: string | null;
  cover_gradient: string;
  pages: SharedStoryPage[];
  child_first_name: string;
};

const schema = z.object({ token: z.string().uuid() });

export const getSharedStory = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data }): Promise<SharedStory | null> => {
    // Load admin client only inside the handler — this module is client-reachable.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: story, error } = await supabaseAdmin
      .from("stories")
      .select(
        "id, title, theme, mood, lesson, length_minutes, cover_emoji, cover_gradient, cover_url, pages, child_id",
      )
      .eq("share_token", data.token)
      .maybeSingle();

    if (error || !story) return null;

    const { data: child } = await supabaseAdmin
      .from("children")
      .select("first_name")
      .eq("id", story.child_id)
      .maybeSingle();

    type RawPage = { text: string; illustration_prompt?: string; image_url?: string | null };
    const rawPages = (story.pages as unknown as RawPage[]) ?? [];

    // Sign image URLs for anonymous viewers
    const signedPages: SharedStoryPage[] = await Promise.all(
      rawPages.map(async (p) => {
        if (!p.image_url) return { text: p.text, image_url: null };
        const { data: signed } = await supabaseAdmin.storage
          .from("adventurer-photos")
          .createSignedUrl(p.image_url, 60 * 60 * 24);
        return { text: p.text, image_url: signed?.signedUrl ?? null };
      }),
    );

    return {
      id: story.id,
      title: story.title,
      theme: story.theme,
      mood: story.mood,
      lesson: story.lesson,
      length_minutes: story.length_minutes,
      cover_emoji: story.cover_emoji,
      cover_gradient: story.cover_gradient,
      pages: signedPages,
      child_first_name: child?.first_name ?? "",
    };
  });
