
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS stories_share_token_key ON public.stories(share_token);
