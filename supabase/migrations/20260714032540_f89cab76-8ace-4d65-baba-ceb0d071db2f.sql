
CREATE OR REPLACE FUNCTION public.set_story_page_image_url(
  p_story_id uuid,
  p_page_index int,
  p_image_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stories
  SET pages = jsonb_set(pages, ARRAY[p_page_index::text, 'image_url'], to_jsonb(p_image_url), true),
      updated_at = now()
  WHERE id = p_story_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_story_page_image_url(uuid, int, text) TO authenticated;
