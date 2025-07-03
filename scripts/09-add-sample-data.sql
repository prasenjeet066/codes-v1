-- Add some sample posts for testing
-- This assumes you have at least one user profile

-- Insert sample posts (you'll need to replace the user_id with an actual user ID from your profiles table)
-- First, let's create a sample user if none exists
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Check if we have any profiles
    SELECT id INTO sample_user_id FROM public.profiles LIMIT 1;
    
    -- If no profiles exist, we can't create sample posts
    IF sample_user_id IS NOT NULL THEN
        -- Insert sample posts
        INSERT INTO public.posts (user_id, content) VALUES
        (sample_user_id, 'এটি আমার প্রথম পোস্ট! #desiiseb #বাংলা'),
        (sample_user_id, 'আজকের আবহাওয়া খুবই সুন্দর। সবাই কেমন আছেন? 🌞'),
        (sample_user_id, 'নতুন প্রযুক্তি নিয়ে কাজ করছি। খুবই উত্তেজনাপূর্ণ! #technology #coding'),
        (sample_user_id, 'সবাইকে শুভ সকাল! আজকের দিনটা হোক সুন্দর। ☀️'),
        (sample_user_id, 'বই পড়ার অভ্যাস গড়ে তুলুন। জ্ঞানই শক্তি! 📚 #reading #knowledge');
        
        RAISE NOTICE 'Sample posts created successfully!';
    ELSE
        RAISE NOTICE 'No user profiles found. Please sign up first to create sample posts.';
    END IF;
END $$;
