-- Migration: Add user profiles and authentication support
-- This enables personalized experiences based on user's course, year, and university

-- ============================================
-- 1. CREATE PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  university TEXT NOT NULL DEFAULT 'JKUAT',
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 5),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'class_rep', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_course_id ON profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles with personalization data (university, course, year of study)';
COMMENT ON COLUMN profiles.year_of_study IS '1-5 representing 1st year through 5th year';
COMMENT ON COLUMN profiles.role IS 'User role: student (default), class_rep, or admin';

-- ============================================
-- 2. UPDATE MATERIALS TABLE
-- ============================================

-- Add user tracking columns to materials
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploader_year INTEGER CHECK (uploader_year BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS uploader_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_uploader_year ON materials(uploader_year);
CREATE INDEX IF NOT EXISTS idx_materials_uploader_course_id ON materials(uploader_course_id);

-- Add comments
COMMENT ON COLUMN materials.user_id IS 'References the user who uploaded this material';
COMMENT ON COLUMN materials.uploader_year IS 'Year of study of the uploader at time of upload';
COMMENT ON COLUMN materials.uploader_course_id IS 'Course the uploader belongs to';

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all profiles (for attribution, leaderboards, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own profile (during onboarding)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users cannot delete their profile (only via account deletion)
-- No DELETE policy = deletion blocked for normal users

-- Update materials RLS to allow filtering by user
DROP POLICY IF EXISTS "Materials are viewable by everyone" ON materials;
CREATE POLICY "Materials are viewable by everyone"
  ON materials
  FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid());

-- ============================================
-- 4. AUTOMATIC PROFILE UPDATE TRIGGER
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on profiles
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get user's full profile with course details
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  university TEXT,
  year_of_study INTEGER,
  role TEXT,
  avatar_url TEXT,
  course_id UUID,
  course_name TEXT,
  course_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.university,
    p.year_of_study,
    p.role,
    p.avatar_url,
    p.course_id,
    c.course_name,
    c.course_code
  FROM profiles p
  LEFT JOIN courses c ON p.course_id = c.id
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. EXAMPLE QUERIES
-- ============================================

-- Find all materials uploaded by a specific user:
-- SELECT * FROM materials WHERE user_id = 'user-uuid-here';

-- Find all materials from users in the same year:
-- SELECT m.* FROM materials m
-- JOIN profiles p ON m.user_id = p.id
-- WHERE p.year_of_study = 3;

-- Get leaderboard of most active uploaders:
-- SELECT
--   p.full_name,
--   p.year_of_study,
--   c.course_name,
--   COUNT(m.id) as upload_count
-- FROM profiles p
-- LEFT JOIN materials m ON p.id = m.user_id
-- LEFT JOIN courses c ON p.course_id = c.id
-- GROUP BY p.id, p.full_name, p.year_of_study, c.course_name
-- ORDER BY upload_count DESC
-- LIMIT 10;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To undo this migration:
-- DROP FUNCTION IF EXISTS get_user_profile(UUID);
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- ALTER TABLE materials DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS uploader_year, DROP COLUMN IF EXISTS uploader_course_id;
-- DROP TABLE IF EXISTS profiles CASCADE;
