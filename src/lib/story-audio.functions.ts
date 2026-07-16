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
  audio_url?: string | null;
  [k: string]: unknown;
};

const DEFAULT_VOICE = "cgSgspJ2msm6clMCkdW9"; // Jessica
const ALLOWED_VOICES = new Set([
  "cgSgspJ2msm6clMCkdW9", // Jessica US F
  "pNInz6obpgDQGcFmaJgB", // Adam US M
  "XB0fDUnXU5powFXDhCwa", // Charlotte UK F
  "onwK4e9ZLuTAKqWW03F9", // Daniel UK M
]);

export const generateStoryPageAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ElevenLabs API key is not configured.");
    const { supabase, userId } = context;

    // Check premium + get voice preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, preferred_voice")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.is_premium) throw new Error("Audio narration is a premium feature.");
    const voiceId =
      profile.preferred_voice && ALLOWED_VOICES.has(profile.preferred_voice)
        ? profile.preferred_voice
        : DEFAULT_VOICE;

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, pages")
      .eq("id", data.storyId)
      .eq("user_id", userId)
      .single();
    if (error || !story) throw new Error("Story not found.");

    const pages = (story.pages as PageObj[]) ?? [];
    const page = pages[data.pageIndex];
    if (!page) throw new Error("Page not found.");

    const path = `${userId}/${data.storyId}/${data.pageIndex}.mp3`;

    // If already generated, just return a fresh signed URL
    if (!page.audio_url) {
      const text = (page.text ?? "").trim();
      if (!text) throw new Error("Page has no text to narrate.");

      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        },
      );
      if (!ttsRes.ok) {
        const errBody = await ttsRes.text();
        throw new Error(`Narration failed: ${ttsRes.status} ${errBody.slice(0, 200)}`);
      }
      const audioBytes = new Uint8Array(await ttsRes.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from("story-audio")
        .upload(path, audioBytes, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw new Error(`Could not store narration: ${upErr.message}`);

      // Atomically persist audio_url via jsonb_set so we don't clobber
      // other fields (e.g. image_url) that may be written concurrently.
      const { error: updErr } = await supabase.rpc(
        "set_story_page_audio_url" as never,
        { p_story_id: data.storyId, p_page_index: data.pageIndex, p_audio_url: path } as never,
      );
      if (updErr) throw new Error(`Could not save narration reference: ${updErr.message}`);
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("story-audio")
      .createSignedUrl(path, 60 * 60);
    if (signErr || !signed) throw new Error("Could not sign narration URL.");

    return { path, audioUrl: signed.signedUrl };
  });
