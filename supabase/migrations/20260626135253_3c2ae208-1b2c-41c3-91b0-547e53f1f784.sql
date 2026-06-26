-- Adventurer gender (drives story wording + illustrations)
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS gender text;

-- Parent profile: store the currently active child so home/library/passport
-- always open on the right adventurer without per-render lookups.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name text;

-- Multi-child stories: optional co-stars in addition to the primary child_id.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS co_star_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];