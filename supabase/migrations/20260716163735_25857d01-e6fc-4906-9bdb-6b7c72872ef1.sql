
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stories_generated_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stories_month_reset_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date + INTERVAL '1 month'),
  ADD COLUMN IF NOT EXISTS stories_generated_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'starter', 'explorer', 'unlimited'));

-- Migrate existing premium users to unlimited
UPDATE public.profiles
  SET subscription_tier = 'unlimited',
      subscription_status = 'active'
  WHERE is_premium = true
    AND subscription_tier = 'free';
