CREATE OR REPLACE FUNCTION public.set_story_page_audio_url(p_story_id uuid, p_page_index integer, p_audio_url text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.stories
  SET pages = jsonb_set(pages, ARRAY[p_page_index::text, 'audio_url'], to_jsonb(p_audio_url), true),
      updated_at = now()
  WHERE id = p_story_id
    AND user_id = auth.uid();
END;
$function$;