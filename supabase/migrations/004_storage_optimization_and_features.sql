-- Migration: Storage Optimization and New Features
-- Date: 2025-10-24
-- Description: Adds R2 storage support, resource links, download tracking, and subscription management

-- ============================================================================
-- 1. Add storage fields to materials table
-- ============================================================================

-- Add storage_location column (supabase or r2)
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'supabase' CHECK (storage_location IN ('supabase', 'r2'));

-- Add storage_path column (path/key in storage)
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add download_count for tracking popularity
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Add last_accessed_at for migration decisions
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for migration queries
CREATE INDEX IF NOT EXISTS idx_materials_storage_migration
ON materials(storage_location, created_at, download_count);

-- Create index for download tracking
CREATE INDEX IF NOT EXISTS idx_materials_download_count
ON materials(download_count DESC);

-- ============================================================================
-- 2. Create resource_links table for YouTube/Drive links
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,

  -- Link details
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('youtube', 'drive', 'external', 'other')),
  description TEXT,

  -- Metadata
  thumbnail_url TEXT,
  duration TEXT, -- For videos (e.g., "15:30")
  author TEXT, -- Channel name or creator

  -- Tracking
  click_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by TEXT, -- Display name

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for resource_links
CREATE INDEX IF NOT EXISTS idx_resource_links_course ON resource_links(course_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_topic ON resource_links(topic_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_type ON resource_links(link_type);
CREATE INDEX IF NOT EXISTS idx_resource_links_user ON resource_links(user_id);

-- RLS policies for resource_links
ALTER TABLE resource_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resource links"
ON resource_links FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create resource links"
ON resource_links FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own resource links"
ON resource_links FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resource links"
ON resource_links FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Create user_question_count table for rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_question_count (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one record per user per day
  UNIQUE(user_id, question_date)
);

-- Indexes for user_question_count
CREATE INDEX IF NOT EXISTS idx_user_question_count_user_date
ON user_question_count(user_id, question_date);

-- RLS policies for user_question_count
ALTER TABLE user_question_count ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own question count"
ON user_question_count FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question count"
ON user_question_count FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question count"
ON user_question_count FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Create subscriptions table (dormant for now)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'class_rep')),

  -- Payment details
  amount_paid INTEGER DEFAULT 0, -- In KES
  payment_ref TEXT, -- M-Pesa reference
  payment_method TEXT DEFAULT 'mpesa',

  -- Subscription period
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Free trial tracking
  free_trial_used BOOLEAN DEFAULT FALSE,
  free_trial_ends_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique: one active subscription per user
  UNIQUE(user_id, status)
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. Create material_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS material_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,

  -- Request details
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT CHECK (material_type IN ('pdf', 'docx', 'pptx', 'link', 'any')),

  -- Request metadata
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  week_number INTEGER,
  year_level INTEGER,

  -- Tracking
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT,
  upvote_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'closed')),

  -- Fulfillment
  fulfilled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfilled_material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for material_requests
CREATE INDEX IF NOT EXISTS idx_material_requests_course ON material_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_upvotes ON material_requests(upvote_count DESC);

-- RLS policies for material_requests
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view material requests"
ON material_requests FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create material requests"
ON material_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own material requests"
ON material_requests FOR UPDATE
TO authenticated
USING (auth.uid() = requested_by);

-- ============================================================================
-- 6. Create material_request_upvotes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS material_request_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES material_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique: one upvote per user per request
  UNIQUE(request_id, user_id)
);

-- Indexes for material_request_upvotes
CREATE INDEX IF NOT EXISTS idx_material_request_upvotes_request ON material_request_upvotes(request_id);
CREATE INDEX IF NOT EXISTS idx_material_request_upvotes_user ON material_request_upvotes(user_id);

-- RLS policies for material_request_upvotes
ALTER TABLE material_request_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upvotes"
ON material_request_upvotes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upvote"
ON material_request_upvotes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own upvotes"
ON material_request_upvotes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Create user_downloads table for tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,

  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_downloads
CREATE INDEX IF NOT EXISTS idx_user_downloads_user ON user_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_downloads_material ON user_downloads(material_id);
CREATE INDEX IF NOT EXISTS idx_user_downloads_date ON user_downloads(downloaded_at DESC);

-- RLS policies for user_downloads
ALTER TABLE user_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads"
ON user_downloads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own downloads"
ON user_downloads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. Create functions and triggers
-- ============================================================================

-- Function to update material download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials
  SET
    download_count = download_count + 1,
    last_accessed_at = NOW()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment download count
DROP TRIGGER IF EXISTS trigger_increment_download_count ON user_downloads;
CREATE TRIGGER trigger_increment_download_count
AFTER INSERT ON user_downloads
FOR EACH ROW
EXECUTE FUNCTION increment_download_count();

-- Function to update request upvote count
CREATE OR REPLACE FUNCTION update_request_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE material_requests
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE material_requests
    SET upvote_count = GREATEST(0, upvote_count - 1)
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update request upvote count
DROP TRIGGER IF EXISTS trigger_update_request_upvote_count ON material_request_upvotes;
CREATE TRIGGER trigger_update_request_upvote_count
AFTER INSERT OR DELETE ON material_request_upvotes
FOR EACH ROW
EXECUTE FUNCTION update_request_upvote_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS trigger_update_resource_links_updated_at ON resource_links;
CREATE TRIGGER trigger_update_resource_links_updated_at
BEFORE UPDATE ON resource_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_material_requests_updated_at ON material_requests;
CREATE TRIGGER trigger_update_material_requests_updated_at
BEFORE UPDATE ON material_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Backfill existing materials with storage_path
-- ============================================================================

-- Extract storage path from file_url for existing materials
UPDATE materials
SET storage_path = REGEXP_REPLACE(
  file_url,
  'https://.*?/storage/v1/object/public/course%20pdfs/',
  '',
  'g'
)
WHERE storage_path IS NULL AND file_url IS NOT NULL;

-- ============================================================================
-- Migration complete!
-- ============================================================================
