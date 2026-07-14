
CREATE OR REPLACE FUNCTION public.bump_reading_streak(p_child_id uuid)
RETURNS TABLE(streak_count integer, last_story_read_date date)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last date;
  v_count integer;
BEGIN
  SELECT c.last_story_read_date, c.streak_count
    INTO v_last, v_count
  FROM public.children c
  WHERE c.id = p_child_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_last = v_today THEN
    NULL;
  ELSIF v_last = v_today - INTERVAL '1 day' THEN
    v_count := COALESCE(v_count, 0) + 1;
  ELSE
    v_count := 1;
  END IF;

  UPDATE public.children
     SET streak_count = v_count,
         last_story_read_date = v_today,
         updated_at = now()
   WHERE id = p_child_id;

  RETURN QUERY SELECT v_count, v_today;
END;
$$;
