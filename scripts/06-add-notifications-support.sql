-- Add support for better notification queries
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON public.likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_follower ON public.follows(following_id, follower_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);

-- Function to create mentions from post content
CREATE OR REPLACE FUNCTION extract_mentions_from_post()
RETURNS TRIGGER AS $$
DECLARE
    mention_match TEXT;
    mentioned_username TEXT;
    mentioned_user_id UUID;
BEGIN
    -- Delete existing mentions for this post
    DELETE FROM public.mentions WHERE post_id = NEW.id;
    
    -- Extract mentions from content (@username)
    FOR mention_match IN
        SELECT regexp_split_to_table(NEW.content, '\s+')
        WHERE regexp_split_to_table(NEW.content, '\s+') ~ '^@[a-zA-Z0-9_]+$'
    LOOP
        mentioned_username := substring(mention_match from 2); -- Remove @ symbol
        
        -- Find the user ID for this username
        SELECT id INTO mentioned_user_id
        FROM public.profiles
        WHERE username = mentioned_username;
        
        -- Insert mention if user exists and it's not self-mention
        IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
            INSERT INTO public.mentions (post_id, mentioned_user_id)
            VALUES (NEW.id, mentioned_user_id)
            ON CONFLICT (post_id, mentioned_user_id) DO NOTHING;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create mentions
DROP TRIGGER IF EXISTS create_mentions_trigger ON public.posts;
CREATE TRIGGER create_mentions_trigger
    AFTER INSERT OR UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION extract_mentions_from_post();
