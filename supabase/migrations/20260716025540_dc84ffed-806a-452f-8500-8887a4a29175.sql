ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS cover_url text;

CREATE OR REPLACE FUNCTION public.set_story_cover_url(p_story_id uuid, p_cover_url text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.stories
  SET cover_url = p_cover_url,
      updated_at = now()
  WHERE id = p_story_id
    AND user_id = auth.uid();
END;
$function$;