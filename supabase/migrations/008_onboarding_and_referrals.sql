-- Migration: Onboarding and Referral System
-- Description: Add fields for onboarding tracking and viral invite system

-- Add onboarding and referral fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Make department optional in courses table (it's not as important)
ALTER TABLE courses ALTER COLUMN department DROP NOT NULL;

-- Add index for fast case-insensitive course lookup (for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_courses_name_lower ON courses(LOWER(course_name));

-- Create course_invites table for tracking invite links
CREATE TABLE IF NOT EXISTS course_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for course_invites
CREATE INDEX IF NOT EXISTS idx_course_invites_course ON course_invites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_invites_inviter ON course_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_course_invites_code ON course_invites(invite_code);

-- Add RLS policies for course_invites
ALTER TABLE course_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to read all invites
CREATE POLICY "Anyone can view course invites"
  ON course_invites FOR SELECT
  USING (true);

-- Allow authenticated users to create invites
CREATE POLICY "Authenticated users can create invites"
  ON course_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Allow users to update their own invites
CREATE POLICY "Users can update their own invites"
  ON course_invites FOR UPDATE
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

-- Function to update referral count when someone is invited
CREATE OR REPLACE FUNCTION increment_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invited_by IS NOT NULL AND OLD.invited_by IS NULL THEN
    UPDATE profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.invited_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically increment referral count
CREATE TRIGGER on_profile_invited
  AFTER UPDATE OF invited_by ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral_count();

-- Comment the schema
COMMENT ON COLUMN profiles.onboarding_completed IS 'Tracks whether user has completed onboarding flow';
COMMENT ON COLUMN profiles.invited_by IS 'User ID of the person who invited this user';
COMMENT ON COLUMN profiles.referral_count IS 'Number of users this person has invited';
COMMENT ON TABLE course_invites IS 'Tracks invite links generated for courses with usage statistics';
