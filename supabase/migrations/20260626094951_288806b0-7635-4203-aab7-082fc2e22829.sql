
ALTER TABLE public.children RENAME COLUMN favorite_animal TO favorite_animals;
ALTER TABLE public.children RENAME COLUMN favorite_color TO favorite_colors;
ALTER TABLE public.children RENAME COLUMN favorite_food TO favorite_foods;
ALTER TABLE public.children RENAME COLUMN favorite_toy TO favorite_toys;
ALTER TABLE public.children RENAME COLUMN favorite_place TO favorite_places;
ALTER TABLE public.children DROP COLUMN IF EXISTS favorite_story;
ALTER TABLE public.children DROP COLUMN IF EXISTS favorite_season;
ALTER TABLE public.children DROP COLUMN IF EXISTS favorite_holiday;
