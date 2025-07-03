-- Create posts table for microblogging (different from existing blog posts)
CREATE TABLE IF NOT EXISTS public.microposts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reply_to UUID REFERENCES public.microposts(id) ON DELETE CASCADE,
  
  CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 280)
);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS public.micropost_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.microposts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, post_id)
);

-- Create hashtags table
CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT hashtag_format CHECK (name ~ '^[a-zA-Z0-9_]+$')
);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS public.micropost_hashtags (
  post_id UUID REFERENCES public.microposts(id) ON DELETE CASCADE,
  hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- Create mentions table
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.microposts(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(post_id, mentioned_user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.microposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micropost_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micropost_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for microposts
CREATE POLICY "Microposts are viewable by everyone" ON public.microposts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own microposts" ON public.microposts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own microposts" ON public.microposts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own microposts" ON public.microposts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for follows
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);

-- Create RLS policies for likes
CREATE POLICY "Micropost likes are viewable by everyone" ON public.micropost_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own micropost likes" ON public.micropost_likes
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for hashtags
CREATE POLICY "Hashtags are viewable by everyone" ON public.hashtags
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create hashtags" ON public.hashtags
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for micropost hashtags
CREATE POLICY "Micropost hashtags are viewable by everyone" ON public.micropost_hashtags
  FOR SELECT USING (true);

CREATE POLICY "Users can manage hashtags for their microposts" ON public.micropost_hashtags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.microposts 
      WHERE microposts.id = micropost_hashtags.post_id 
      AND microposts.user_id = auth.uid()
    )
  );

-- Create RLS policies for mentions
CREATE POLICY "Mentions are viewable by everyone" ON public.mentions
  FOR SELECT USING (true);

CREATE POLICY "Users can create mentions in their microposts" ON public.mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.microposts 
      WHERE microposts.id = mentions.post_id 
      AND microposts.user_id = auth.uid()
    )
  );
