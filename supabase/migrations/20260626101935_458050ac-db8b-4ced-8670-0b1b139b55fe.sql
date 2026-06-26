
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title text NOT NULL,
  theme text NOT NULL,
  mood text NOT NULL,
  lesson text NOT NULL,
  length_minutes integer NOT NULL DEFAULT 5,
  cover_emoji text NOT NULL DEFAULT '✨',
  cover_gradient text NOT NULL DEFAULT 'from-[oklch(0.35_0.12_260)] via-[oklch(0.28_0.08_280)] to-[oklch(0.22_0.05_295)]',
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  favorite boolean NOT NULL DEFAULT false,
  progress real NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stories" ON public.stories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER stories_set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX stories_user_created_idx ON public.stories(user_id, created_at DESC);
CREATE INDEX stories_child_idx ON public.stories(child_id);
