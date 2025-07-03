-- Add missing columns to the existing profiles table for microblogging functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add constraints for username
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS username_length CHECK (username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 25));

ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS username_format CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]+$');

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
