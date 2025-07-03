-- WARNING: This will delete ALL data in your database
-- Only run this if you want to completely reset your database

-- Drop all custom tables (in reverse dependency order)
DROP TABLE IF EXISTS public.mentions CASCADE;
DROP TABLE IF EXISTS public.micropost_hashtags CASCADE;
DROP TABLE IF EXISTS public.hashtags CASCADE;
DROP TABLE IF EXISTS public.micropost_likes CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.microposts CASCADE;

-- Drop existing tables from previous schema
DROP TABLE IF EXISTS public.post_hashtags CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

-- Drop other existing tables
DROP TABLE IF EXISTS public.post_revisions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all custom functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_timeline_posts(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.search_microposts(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.search_posts(TEXT, INTEGER) CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Note: We don't drop auth.users as it's managed by Supabase Auth
