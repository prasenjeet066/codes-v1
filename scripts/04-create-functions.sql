-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get timeline posts
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
  reply_to UUID
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
    p.reply_to
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
  WHERE p.user_id = user_uuid 
    OR p.user_id IN (
      SELECT following_id 
      FROM public.follows 
      WHERE follower_id = user_uuid
    )
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search posts
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  likes_count BIGINT
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
    COALESCE(l.likes_count, 0) as likes_count
  FROM public.posts p
  JOIN public.profiles pr ON p.user_id = pr.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as likes_count
    FROM public.likes
    GROUP BY post_id
  ) l ON p.id = l.post_id
  WHERE p.content ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
  posts_count BIGINT,
  followers_count BIGINT,
  following_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.posts WHERE user_id = user_uuid) as posts_count,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = user_uuid) as followers_count,
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = user_uuid) as following_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
