-- Ensure verification_requests table exists with proper structure
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON verification_requests(created_at DESC);

-- Enable RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can create their own verification requests" ON verification_requests;

-- RLS policies for verification_requests
CREATE POLICY "Users can view their own verification requests" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification requests" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all verification requests
CREATE POLICY "Admins can manage verification requests" ON verification_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to handle verification request creation
CREATE OR REPLACE FUNCTION create_verification_request(user_uuid UUID, request_reason TEXT DEFAULT 'User requested verification')
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  existing_request UUID;
BEGIN
  -- Check if user already has a pending request
  SELECT id INTO existing_request
  FROM verification_requests
  WHERE user_id = user_uuid AND status = 'pending';
  
  IF existing_request IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a pending verification request';
  END IF;
  
  -- Create new verification request
  INSERT INTO verification_requests (user_id, reason, status)
  VALUES (user_uuid, request_reason, 'pending')
  RETURNING id INTO request_id;
  
  -- Update profile to mark verification as requested
  UPDATE profiles 
  SET 
    verification_requested = TRUE,
    verification_requested_at = NOW()
  WHERE id = user_uuid;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve verification request
CREATE OR REPLACE FUNCTION approve_verification_request(request_uuid UUID, admin_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = admin_uuid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve verification requests';
  END IF;
  
  -- Get the user_id from the request
  SELECT user_id INTO target_user_id
  FROM verification_requests
  WHERE id = request_uuid AND status = 'pending';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  -- Update the verification request
  UPDATE verification_requests
  SET 
    status = 'approved',
    reviewed_by = admin_uuid,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = request_uuid;
  
  -- Update the user profile
  UPDATE profiles
  SET 
    is_verified = TRUE,
    verified_at = NOW()
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject verification request
CREATE OR REPLACE FUNCTION reject_verification_request(request_uuid UUID, admin_uuid UUID, rejection_reason TEXT DEFAULT 'Request does not meet verification criteria')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = admin_uuid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject verification requests';
  END IF;
  
  -- Update the verification request
  UPDATE verification_requests
  SET 
    status = 'rejected',
    reason = rejection_reason,
    reviewed_by = admin_uuid,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = request_uuid AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update profiles when verification request is created
CREATE OR REPLACE FUNCTION handle_verification_request_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    -- Update profile when verification request is created
    UPDATE profiles 
    SET 
      verification_requested = TRUE, 
      verification_requested_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for verification requests
DROP TRIGGER IF EXISTS verification_request_trigger ON verification_requests;
CREATE TRIGGER verification_request_trigger
  AFTER INSERT ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION handle_verification_request_trigger();

-- Grant necessary permissions
GRANT SELECT, INSERT ON verification_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
