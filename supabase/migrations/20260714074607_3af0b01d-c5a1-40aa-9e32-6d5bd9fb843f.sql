-- Add premium flag and voice preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_voice text NOT NULL DEFAULT 'cgSgspJ2msm6clMCkdW9';