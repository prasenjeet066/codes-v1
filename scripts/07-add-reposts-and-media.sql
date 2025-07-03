-- Add reposts table
CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, post_id)
);

-- Add media support to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[],
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', 'gif'));

-- Enable RLS on reposts
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reposts
CREATE POLICY "Reposts are viewable by everyone" ON public.reposts
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reposts" ON public.reposts
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON public.reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_created_at ON public.reposts(created_at DESC);

-- Update timeline function to include reposts
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
    -- Original posts
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
    
    -- Reposts
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

-- Function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  name TEXT,
  posts_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.name,
    COUNT(ph.post_id) as posts_count
  FROM public.hashtags h
  JOIN public.post_hashtags ph ON h.id = ph.hashtag_id
  JOIN public.posts p ON ph.post_id = p.id
  WHERE p.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY h.name
  ORDER BY posts_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
