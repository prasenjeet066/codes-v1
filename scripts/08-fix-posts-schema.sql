-- Fix the posts table and related issues

-- First, let's check what tables exist and fix the schema
-- Drop the problematic timeline function
DROP FUNCTION IF EXISTS get_timeline_posts(UUID, INTEGER, INTEGER);

-- Make sure we're using the correct posts table (not microposts)
-- The app is expecting 'posts' table, so let's ensure it exists with correct structure

-- Create or update the posts table with all required columns
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reply_to UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  media_urls TEXT[],
  media_type TEXT CHECK (media_type IN ('image', 'video', 'gif')),
  
  CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 280)
);

-- Ensure RLS is enabled
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Recreate policies to make sure they exist
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON public.posts(reply_to);

-- Ensure reposts table exists
CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, post_id)
);

-- Enable RLS on reposts
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reposts
DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON public.reposts;
DROP POLICY IF EXISTS "Users can manage their own reposts" ON public.reposts;

CREATE POLICY "Reposts are viewable by everyone" ON public.reposts
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reposts" ON public.reposts
  FOR ALL USING (auth.uid() = user_id);

-- Create a simplified timeline function that works
CREATE OR REPLACE FUNCTION get_timeline_posts(user_uuid UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  likes_count BIGINT,
  is_liked BOOLEAN,
  reposts_count BIGINT,
  is_reposted BOOLEAN,
  reply_to UUID,
  media_urls TEXT[],
  media_type TEXT,
  is_repost BOOLEAN,
  repost_user_id UUID,
  repost_username TEXT,
  repost_display_name TEXT,
  repost_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH timeline_content AS (
    -- Original posts from user and followed users
    SELECT 
      p.id,
      p.content,
      p.created_at,
      p.user_id,
      pr.username,
      pr.display_name,
      pr.avatar_url,
      p.reply_to,
      p.media_urls,
      p.media_type,
      false as is_repost,
      NULL::UUID as repost_user_id,
      NULL::TEXT as repost_username,
      NULL::TEXT as repost_display_name,
      NULL::TIMESTAMP WITH TIME ZONE as repost_created_at
    FROM public.posts p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.user_id = user_uuid 
      OR p.user_id IN (
        SELECT following_id 
        FROM public.follows 
        WHERE follower_id = user_uuid
      )
    
    UNION ALL
    
    -- Reposts from user and followed users
    SELECT 
      p.id,
      p.content,
      p.created_at,
      p.user_id,
      pr.username,
      pr.display_name,
      pr.avatar_url,
      p.reply_to,
      p.media_urls,
      p.media_type,
      true as is_repost,
      r.user_id as repost_user_id,
      rpr.username as repost_username,
      rpr.display_name as repost_display_name,
      r.created_at as repost_created_at
    FROM public.reposts r
    JOIN public.posts p ON r.post_id = p.id
    JOIN public.profiles pr ON p.user_id = pr.id
    JOIN public.profiles rpr ON r.user_id = rpr.id
    WHERE r.user_id = user_uuid 
      OR r.user_id IN (
        SELECT following_id 
        FROM public.follows 
        WHERE follower_id = user_uuid
      )
  )
  SELECT 
    tc.id,
    tc.content,
    tc.created_at,
    tc.user_id,
    tc.username,
    tc.display_name,
    tc.avatar_url,
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(ul.is_liked, false) as is_liked,
    COALESCE(r.reposts_count, 0) as reposts_count,
    COALESCE(ur.is_reposted, false) as is_reposted,
    tc.reply_to,
    tc.media_urls,
    tc.media_type,
    tc.is_repost,
    tc.repost_user_id,
    tc.repost_username,
    tc.repost_display_name,
    tc.repost_created_at
  FROM timeline_content tc
  LEFT JOIN (
    SELECT post_id, COUNT(*) as likes_count
    FROM public.likes
    GROUP BY post_id
  ) l ON tc.id = l.post_id
  LEFT JOIN (
    SELECT post_id, true as is_liked
    FROM public.likes
    WHERE user_id = user_uuid
  ) ul ON tc.id = ul.post_id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as reposts_count
    FROM public.reposts
    GROUP BY post_id
  ) r ON tc.id = r.post_id
  LEFT JOIN (
    SELECT post_id, true as is_reposted
    FROM public.reposts
    WHERE user_id = user_uuid
  ) ur ON tc.id = ur.post_id
  ORDER BY COALESCE(tc.repost_created_at, tc.created_at) DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
