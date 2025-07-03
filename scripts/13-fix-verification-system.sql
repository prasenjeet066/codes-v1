-- Ensure the profiles table has the is_verified column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Update some test users to be verified for testing
UPDATE profiles 
SET is_verified = TRUE 
WHERE username IN ('admin', 'test', 'demo');

-- Create a function to handle verification
CREATE OR REPLACE FUNCTION verify_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET is_verified = TRUE, verified_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to unverify user
CREATE OR REPLACE FUNCTION unverify_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET is_verified = FALSE, verified_at = NULL
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
