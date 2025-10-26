-- Content Deletion & Moderation System Migration
-- Implements soft delete, hard delete, trash bin, and deletion requests

-- =====================================================
-- PART 1: Add Deletion Fields to Existing Tables
-- =====================================================

-- Add deletion fields to materials table
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('soft', 'hard')),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS download_count_at_deletion INTEGER,
ADD COLUMN IF NOT EXISTS view_count_at_deletion INTEGER,
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false;

-- Add deletion fields to topics table
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('soft', 'hard')),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false;

-- Add deletion fields to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('soft', 'hard')),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- =====================================================
-- PART 2: Create Deletion Requests Table
-- =====================================================

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  request_reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure at least one entity is specified
  CONSTRAINT at_least_one_entity CHECK (
    material_id IS NOT NULL OR
    topic_id IS NOT NULL OR
    course_id IS NOT NULL
  ),

  -- Ensure only one entity is specified
  CONSTRAINT only_one_entity CHECK (
    (material_id IS NOT NULL)::int +
    (topic_id IS NOT NULL)::int +
    (course_id IS NOT NULL)::int = 1
  )
);

-- Add indexes for deletion requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_material_id ON deletion_requests(material_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by ON deletion_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- =====================================================
-- PART 3: Create Deletion Audit Log
-- =====================================================

CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('material', 'topic', 'course')),
  entity_id UUID NOT NULL,
  entity_title TEXT,
  deletion_type TEXT CHECK (deletion_type IN ('soft', 'hard')),
  deletion_reason TEXT,
  deleted_by UUID REFERENCES profiles(id),
  download_count_at_deletion INTEGER,
  view_count_at_deletion INTEGER,
  deleted_at TIMESTAMP DEFAULT NOW(),

  -- For restoration tracking
  restored_at TIMESTAMP,
  restored_by UUID REFERENCES profiles(id)
);

-- Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_deletion_audit_entity_type ON deletion_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_by ON deletion_audit_log(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON deletion_audit_log(deleted_at DESC);

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Function to get trash bin items (soft-deleted items)
CREATE OR REPLACE FUNCTION get_trash_bin_items()
RETURNS TABLE (
  id UUID,
  title TEXT,
  entity_type TEXT,
  deleted_at TIMESTAMP,
  deleted_by UUID,
  deleter_name TEXT,
  deletion_reason TEXT,
  download_count INTEGER,
  view_count INTEGER,
  days_in_trash INTEGER,
  days_remaining INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    'material'::text as entity_type,
    m.deleted_at,
    m.deleted_by,
    p.full_name as deleter_name,
    m.deletion_reason,
    m.download_count_at_deletion as download_count,
    m.view_count_at_deletion as view_count,
    EXTRACT(DAY FROM (NOW() - m.deleted_at))::integer as days_in_trash,
    (30 - EXTRACT(DAY FROM (NOW() - m.deleted_at)))::integer as days_remaining
  FROM materials m
  LEFT JOIN profiles p ON p.id = m.deleted_by
  WHERE m.deleted_at IS NOT NULL AND m.deletion_type = 'soft'

  UNION ALL

  SELECT
    t.id,
    t.topic_name as title,
    'topic'::text as entity_type,
    t.deleted_at,
    t.deleted_by,
    p.full_name as deleter_name,
    t.deletion_reason,
    0 as download_count,
    0 as view_count,
    EXTRACT(DAY FROM (NOW() - t.deleted_at))::integer as days_in_trash,
    (30 - EXTRACT(DAY FROM (NOW() - t.deleted_at)))::integer as days_remaining
  FROM topics t
  LEFT JOIN profiles p ON p.id = t.deleted_by
  WHERE t.deleted_at IS NOT NULL AND t.deletion_type = 'soft'

  UNION ALL

  SELECT
    c.id,
    c.course_name as title,
    'course'::text as entity_type,
    c.deleted_at,
    c.deleted_by,
    p.full_name as deleter_name,
    c.deletion_reason,
    0 as download_count,
    0 as view_count,
    EXTRACT(DAY FROM (NOW() - c.deleted_at))::integer as days_in_trash,
    (30 - EXTRACT(DAY FROM (NOW() - c.deleted_at)))::integer as days_remaining
  FROM courses c
  LEFT JOIN profiles p ON p.id = c.deleted_by
  WHERE c.deleted_at IS NOT NULL AND c.deletion_type = 'soft'

  ORDER BY deleted_at DESC;
$$;

-- Function to get items ready for permanent deletion (>30 days in trash)
CREATE OR REPLACE FUNCTION get_items_for_permanent_deletion()
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  title TEXT,
  days_in_trash INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    'material'::text as entity_type,
    m.title,
    EXTRACT(DAY FROM (NOW() - m.deleted_at))::integer as days_in_trash
  FROM materials m
  WHERE m.deleted_at IS NOT NULL
    AND m.deletion_type = 'soft'
    AND m.deleted_at < (NOW() - INTERVAL '30 days')

  UNION ALL

  SELECT
    t.id,
    'topic'::text as entity_type,
    t.topic_name as title,
    EXTRACT(DAY FROM (NOW() - t.deleted_at))::integer as days_in_trash
  FROM topics t
  WHERE t.deleted_at IS NOT NULL
    AND t.deletion_type = 'soft'
    AND t.deleted_at < (NOW() - INTERVAL '30 days')

  UNION ALL

  SELECT
    c.id,
    'course'::text as entity_type,
    c.course_name as title,
    EXTRACT(DAY FROM (NOW() - c.deleted_at))::integer as days_in_trash
  FROM courses c
  WHERE c.deleted_at IS NOT NULL
    AND c.deletion_type = 'soft'
    AND c.deleted_at < (NOW() - INTERVAL '30 days');
$$;

-- Function to get orphaned content
CREATE OR REPLACE FUNCTION get_orphaned_content()
RETURNS TABLE (
  id UUID,
  title TEXT,
  entity_type TEXT,
  original_course_id UUID,
  original_course_name TEXT,
  created_at TIMESTAMP,
  download_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    'material'::text as entity_type,
    m.course_id as original_course_id,
    c.course_name as original_course_name,
    m.created_at,
    m.download_count
  FROM materials m
  LEFT JOIN courses c ON c.id = m.course_id
  WHERE m.is_orphaned = true AND m.deleted_at IS NULL

  UNION ALL

  SELECT
    t.id,
    t.topic_name as title,
    'topic'::text as entity_type,
    t.course_id as original_course_id,
    c.course_name as original_course_name,
    t.created_at,
    0 as download_count
  FROM topics t
  LEFT JOIN courses c ON c.id = t.course_id
  WHERE t.is_orphaned = true AND t.deleted_at IS NULL

  ORDER BY created_at DESC;
$$;

-- Function to get pending deletion requests with details
CREATE OR REPLACE FUNCTION get_pending_deletion_requests()
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_title TEXT,
  request_reason TEXT,
  requested_by UUID,
  requester_name TEXT,
  requester_email TEXT,
  created_at TIMESTAMP,
  material_download_count INTEGER,
  material_view_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    dr.id,
    'material'::text as entity_type,
    m.title as entity_title,
    dr.request_reason,
    dr.requested_by,
    p.full_name as requester_name,
    p.email as requester_email,
    dr.created_at,
    m.download_count as material_download_count,
    m.view_count as material_view_count
  FROM deletion_requests dr
  INNER JOIN materials m ON m.id = dr.material_id
  LEFT JOIN profiles p ON p.id = dr.requested_by
  WHERE dr.status = 'pending' AND dr.material_id IS NOT NULL

  UNION ALL

  SELECT
    dr.id,
    'topic'::text as entity_type,
    t.topic_name as entity_title,
    dr.request_reason,
    dr.requested_by,
    p.full_name as requester_name,
    p.email as requester_email,
    dr.created_at,
    0 as material_download_count,
    0 as material_view_count
  FROM deletion_requests dr
  INNER JOIN topics t ON t.id = dr.topic_id
  LEFT JOIN profiles p ON p.id = dr.requested_by
  WHERE dr.status = 'pending' AND dr.topic_id IS NOT NULL

  UNION ALL

  SELECT
    dr.id,
    'course'::text as entity_type,
    c.course_name as entity_title,
    dr.request_reason,
    dr.requested_by,
    p.full_name as requester_name,
    p.email as requester_email,
    dr.created_at,
    0 as material_download_count,
    0 as material_view_count
  FROM deletion_requests dr
  INNER JOIN courses c ON c.id = dr.course_id
  LEFT JOIN profiles p ON p.id = dr.requested_by
  WHERE dr.status = 'pending' AND dr.course_id IS NOT NULL

  ORDER BY created_at ASC;
$$;

-- =====================================================
-- PART 5: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Deletion requests: Students can view their own, admins can view all
CREATE POLICY "Users can view own deletion requests"
  ON deletion_requests FOR SELECT
  USING (auth.uid() = requested_by);

CREATE POLICY "Admins can view all deletion requests"
  ON deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can create deletion requests for their own materials
CREATE POLICY "Users can request deletion of own materials"
  ON deletion_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND (
      -- Check if they own the material
      (material_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM materials
        WHERE materials.id = material_id
        AND materials.uploaded_by = auth.uid()
      ))
      -- Similar checks for topic and course if needed
    )
  );

-- Admins can update deletion requests (approve/reject)
CREATE POLICY "Admins can update deletion requests"
  ON deletion_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Deletion audit log: Only admins can view
CREATE POLICY "Admins can view audit log"
  ON deletion_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert into audit log (via API only)
CREATE POLICY "Admins can insert audit log"
  ON deletion_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- PART 6: Update Existing Queries to Exclude Deleted Items
-- =====================================================

-- Note: Existing RLS policies on materials/topics/courses should be updated
-- to exclude soft-deleted items (deleted_at IS NULL) for non-admin users

-- This will be done via policy updates in a future migration if needed
-- For now, we'll handle this in the application layer

-- =====================================================
-- PART 7: Create Indexes for Performance
-- =====================================================

-- Indexes for deletion fields
CREATE INDEX IF NOT EXISTS idx_materials_deleted_at ON materials(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_is_orphaned ON materials(is_orphaned) WHERE is_orphaned = true;
CREATE INDEX IF NOT EXISTS idx_topics_deleted_at ON topics(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_is_orphaned ON topics(is_orphaned) WHERE is_orphaned = true;
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at ON courses(deleted_at) WHERE deleted_at IS NOT NULL;

-- Analyze tables for query optimization
ANALYZE materials;
ANALYZE topics;
ANALYZE courses;
ANALYZE deletion_requests;
ANALYZE deletion_audit_log;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Migration successfully creates:
-- ✅ Deletion fields on materials, topics, courses
-- ✅ deletion_requests table
-- ✅ deletion_audit_log table
-- ✅ Helper functions for trash bin, orphaned content, etc.
-- ✅ RLS policies for security
-- ✅ Performance indexes
