-- ========================================================
-- NIVE APP SUPABASE DATABASE SCHEMA
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor and click RUN
-- ========================================================

-- 1. Create Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  genre TEXT,
  tags TEXT[],
  cover_image TEXT,
  banner_image TEXT,
  status TEXT DEFAULT 'ongoing',
  featured BOOLEAN DEFAULT FALSE,
  trending BOOLEAN DEFAULT FALSE,
  coins_required INT DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  read_count INT DEFAULT 0,
  total_chapters INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Chapters Table
CREATE TABLE IF NOT EXISTS public.chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  order_num INT DEFAULT 1,
  content TEXT,
  word_count INT DEFAULT 0,
  coins_cost INT DEFAULT 0,
  choices JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  coins INT DEFAULT 50,
  unlocked_stories JSONB DEFAULT '[]'::jsonb,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  role TEXT DEFAULT 'reader',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS unlocked_stories JSONB DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF to_regclass('public.bank_transfers') IS NOT NULL THEN
    ALTER TABLE public.bank_transfers
      ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS) & Public Read Access
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete on stories" ON public.stories FOR ALL USING (true);
CREATE POLICY "Allow public insert/update/delete on chapters" ON public.chapters FOR ALL USING (true);
CREATE POLICY "Allow public insert/update/delete on users" ON public.users FOR ALL USING (true);

-- 5. Enable Supabase Realtime Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
