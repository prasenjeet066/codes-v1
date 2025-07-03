-- Drop existing repost-related functions and recreate them
DROP FUNCTION IF EXISTS get_timeline_posts(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_post_stats(UUID, UUID);

-- Ensure posts table has repost_of column
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS repost_of UUID REFERENCES public.posts(id) ON DELETE CASCADE;

-- Create index for repost queries
CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON public.posts(repost_of);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts(user_id, created_at DESC);

-- Function to get timeline posts with proper repost handling
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
  replies_count BIGINT,
  reply_to UUID,
  media_urls TEXT[],
  media_type TEXT,
  is_repost BOOLEAN,
  repost_of UUID,
  repost_user_id UUID,
  repost_username TEXT,
  repost_display_name TEXT,
  repost_created_at TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN,
  is_pinned BOOLEAN
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
      p.repost_of,
      p.is_pinned,
      false as is_repost,
      NULL::UUID as repost_user_id,
      NULL::TEXT as repost_username,
      NULL::TEXT as repost_display_name,
      NULL::TIMESTAMP WITH TIME ZONE as repost_created_at,
      pr.is_verified
    FROM public.posts p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.repost_of IS NULL -- Only original posts, not reposts
      AND (p.user_id = user_uuid 
        OR p.user_id IN (
          SELECT following_id 
          FROM public.follows 
          WHERE follower_id = user_uuid
        ))
    
    UNION ALL
    
    -- Reposts from user and followed users (simple reposts)
    SELECT 
      op.id, -- Original post ID
      op.content, -- Original post content
      op.created_at, -- Original post creation time
      op.user_id, -- Original post author
      opr.username, -- Original post author username
      opr.display_name, -- Original post author display name
      opr.avatar_url, -- Original post author avatar
      op.reply_to,
      op.media_urls,
      op.media_type,
      op.id as repost_of, -- This is a repost
      op.is_pinned,
      true as is_repost,
      rp.user_id as repost_user_id, -- Who reposted it
      rpr.username as repost_username,
      rpr.display_name as repost_display_name,
      rp.created_at as repost_created_at, -- When it was reposted
      opr.is_verified
    FROM public.posts rp -- The repost record
    JOIN public.posts op ON rp.repost_of = op.id -- The original post
    JOIN public.profiles opr ON op.user_id = opr.id -- Original post author
    JOIN public.profiles rpr ON rp.user_id = rpr.id -- Reposter
    WHERE rp.repost_of IS NOT NULL -- Only reposts
      AND rp.content = '' -- Simple reposts (no quote)
      AND (rp.user_id = user_uuid 
        OR rp.user_id IN (
          SELECT following_id 
          FROM public.follows 
          WHERE follower_id = user_uuid
        ))
        
    UNION ALL
    
    -- Quote reposts from user and followed users
    SELECT 
      rp.id, -- Quote repost ID
      rp.content, -- Quote repost content
      rp.created_at, -- Quote repost creation time
      rp.user_id, -- Quote repost author
      rpr.username, -- Quote repost author username
      rpr.display_name, -- Quote repost author display name
      rpr.avatar_url, -- Quote repost author avatar
      rp.reply_to,
      rp.media_urls,
      rp.media_type,
      rp.repost_of,
      rp.is_pinned,
      false as is_repost, -- Quote reposts are treated as original posts
      NULL::UUID as repost_user_id,
      NULL::TEXT as repost_username,
      NULL::TEXT as repost_display_name,
      NULL::TIMESTAMP WITH TIME ZONE as repost_created_at,
      rpr.is_verified
    FROM public.posts rp -- The quote repost
    JOIN public.profiles rpr ON rp.user_id = rpr.id -- Quote reposter
    WHERE rp.repost_of IS NOT NULL -- Only reposts
      AND rp.content != '' -- Quote reposts (has content)
      AND (rp.user_id = user_uuid 
        OR rp.user_id IN (
          SELECT following_id 
          FROM public.follows 
          WHERE follower_id = user_uuid
        ))
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
    COALESCE(rp.replies_count, 0) as replies_count,
    tc.reply_to,
    tc.media_urls,
    tc.media_type,
    tc.is_repost,
    tc.repost_of,
    tc.repost_user_id,
    tc.repost_username,
    tc.repost_display_name,
    tc.repost_created_at,
    tc.is_verified,
    tc.is_pinned
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
    SELECT repost_of, COUNT(*) as reposts_count
    FROM public.posts
    WHERE repost_of IS NOT NULL
    GROUP BY repost_of
  ) r ON tc.id = r.repost_of
  LEFT JOIN (
    SELECT repost_of, true as is_reposted
    FROM public.posts
    WHERE repost_of IS NOT NULL AND user_id = user_uuid
  ) ur ON tc.id = ur.repost_of
  LEFT JOIN (
    SELECT reply_to, COUNT(*) as replies_count
    FROM public.posts
    WHERE reply_to IS NOT NULL
    GROUP BY reply_to
  ) rp ON tc.id = rp.reply_to
  ORDER BY 
    tc.is_pinned DESC, -- Pinned posts first
    COALESCE(tc.repost_created_at, tc.created_at) DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  tag TEXT,
  count BIGINT,
  trending BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH hashtag_matches AS (
    SELECT 
      regexp_split_to_table(content, '\s+') as word,
      created_at
    FROM public.posts
    WHERE created_at >= NOW() - INTERVAL '7 days'
  ),
  hashtags AS (
    SELECT 
      LOWER(SUBSTRING(word FROM 2)) as tag,
      COUNT(*) as count
    FROM hashtag_matches
    WHERE word ~ '^#[a-zA-Z0-9_\u0980-\u09FF]+$'
    GROUP BY LOWER(SUBSTRING(word FROM 2))
    HAVING COUNT(*) >= 2
  )
  SELECT 
    h.tag,
    h.count,
    h.count >= 10 as trending
  FROM hashtags h
  ORDER BY h.count DESC, h.tag
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search posts with hashtags and mentions
CREATE OR REPLACE FUNCTION search_posts_advanced(search_query TEXT, user_uuid UUID DEFAULT NULL, limit_count INTEGER DEFAULT 20)
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
  replies_count BIGINT,
  media_urls TEXT[],
  media_type TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.content,
    p.created_at,
    p.user_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(ul.is_liked, false) as is_liked,
    COALESCE(r.reposts_count, 0) as reposts_count,
    COALESCE(ur.is_reposted, false) as is_reposted,
    COALESCE(rp.replies_count, 0) as replies_count,
    p.media_urls,
    p.media_type,
    pr.is_verified
  FROM public.posts p
  JOIN public.profiles pr ON p.user_id = pr.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as likes_count
    FROM public.likes
    GROUP BY post_id
  ) l ON p.id = l.post_id
  LEFT JOIN (
    SELECT post_id, true as is_liked
    FROM public.likes
    WHERE user_id = user_uuid
  ) ul ON p.id = ul.post_id
  LEFT JOIN (
    SELECT repost_of, COUNT(*) as reposts_count
    FROM public.posts
    WHERE repost_of IS NOT NULL
    GROUP BY repost_of
  ) r ON p.id = r.repost_of
  LEFT JOIN (
    SELECT repost_of, true as is_reposted
    FROM public.posts
    WHERE repost_of IS NOT NULL AND user_id = user_uuid
  ) ur ON p.id = ur.repost_of
  LEFT JOIN (
    SELECT reply_to, COUNT(*) as replies_count
    FROM public.posts
    WHERE reply_to IS NOT NULL
    GROUP BY reply_to
  ) rp ON p.id = rp.reply_to
  WHERE p.repost_of IS NULL -- Only original posts and quote reposts
    AND (
      p.content ILIKE '%' || search_query || '%'
      OR p.content ~ ('#' || search_query)
      OR p.content ~ ('@' || search_query)
    )
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get post statistics
CREATE OR REPLACE FUNCTION get_post_stats(post_uuid UUID, user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  likes_count BIGINT,
  is_liked BOOLEAN,
  reposts_count BIGINT,
  is_reposted BOOLEAN,
  replies_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(ul.is_liked, false) as is_liked,
    COALESCE(r.reposts_count, 0) as reposts_count,
    COALESCE(ur.is_reposted, false) as is_reposted,
    COALESCE(rp.replies_count, 0) as replies_count
  FROM (SELECT 1) dummy -- Dummy table for the FROM clause
  LEFT JOIN (
    SELECT COUNT(*) as likes_count
    FROM public.likes
    WHERE post_id = post_uuid
  ) l ON true
  LEFT JOIN (
    SELECT true as is_liked
    FROM public.likes
    WHERE post_id = post_uuid AND user_id = user_uuid
  ) ul ON true
  LEFT JOIN (
    SELECT COUNT(*) as reposts_count
    FROM public.posts
    WHERE repost_of = post_uuid
  ) r ON true
  LEFT JOIN (
    SELECT true as is_reposted
    FROM public.posts
    WHERE repost_of = post_uuid AND user_id = user_uuid
  ) ur ON true
  LEFT JOIN (
    SELECT COUNT(*) as replies_count
    FROM public.posts
    WHERE reply_to = post_uuid
  ) rp ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for reposts
CREATE POLICY "Users can view all reposts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create reposts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reposts" ON posts
  FOR DELETE USING (auth.uid() = user_id);
