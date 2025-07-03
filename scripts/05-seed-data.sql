-- Insert some sample data for testing (optional)
-- This will only work after you have at least one authenticated user

-- Sample hashtags
INSERT INTO public.hashtags (name) VALUES 
  ('technology'),
  ('design'),
  ('startup'),
  ('coding'),
  ('ai'),
  ('webdev'),
  ('javascript'),
  ('react'),
  ('nextjs'),
  ('supabase')
ON CONFLICT (name) DO NOTHING;

-- Note: Sample posts and follows will be created when users sign up and start using the platform
