-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_to_use TEXT;
  display_name_to_use TEXT;
  counter INTEGER := 0;
  base_username TEXT;
BEGIN
  -- Get username and display name from metadata
  username_to_use := NEW.raw_user_meta_data->>'username';
  display_name_to_use := NEW.raw_user_meta_data->>'display_name';
  
  -- If no username provided, generate from email
  IF username_to_use IS NULL OR username_to_use = '' THEN
    base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    -- Remove non-alphanumeric characters except underscore
    base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g');
    -- Ensure it starts with a letter
    IF base_username !~ '^[a-zA-Z]' THEN
      base_username := 'user_' || base_username;
    END IF;
    username_to_use := base_username;
  END IF;
  
  -- If no display name provided, use username
  IF display_name_to_use IS NULL OR display_name_to_use = '' THEN
    display_name_to_use := username_to_use;
  END IF;
  
  -- Check if username already exists and generate unique one
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_to_use) LOOP
    counter := counter + 1;
    username_to_use := base_username || '_' || counter;
  END LOOP;
  
  -- Insert profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      email,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      username_to_use,
      display_name_to_use,
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(username_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if username exists
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(username_input)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_username_availability(TEXT) TO anon, authenticated;
