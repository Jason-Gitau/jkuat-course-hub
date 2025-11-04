-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire SQL script
-- 4. Click "Run" to execute
--
-- This will:
-- - Create automatic profile creation for new signups
-- - Backfill profiles for existing users without profiles

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile for new user with data from auth metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Try to get full_name from Google OAuth metadata, fallback to 'New User'
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'New User'
    ),
    FALSE  -- Force user to complete onboarding
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors

  RETURN NEW;
END;
$$;

-- Trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: Create profiles for existing users who don't have one yet
INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    'Existing User'
  ) as full_name,
  FALSE as onboarding_completed
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;  -- Only insert where profile doesn't exist

-- Verify the backfill worked
SELECT
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;
