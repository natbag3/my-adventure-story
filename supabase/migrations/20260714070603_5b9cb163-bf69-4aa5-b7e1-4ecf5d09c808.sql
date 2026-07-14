
CREATE TABLE public.story_series (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_parts integer NOT NULL DEFAULT 5,
  current_part integer NOT NULL DEFAULT 1,
  world_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_series TO authenticated;
GRANT ALL ON public.story_series TO service_role;

ALTER TABLE public.story_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own story_series"
  ON public.story_series
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER story_series_set_updated_at
  BEFORE UPDATE ON public.story_series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX story_series_child_idx ON public.story_series(child_id);

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.story_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_part integer;

CREATE INDEX IF NOT EXISTS stories_series_idx ON public.stories(series_id, series_part);
