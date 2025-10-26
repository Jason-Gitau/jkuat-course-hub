-- Performance Optimization Migration
-- Creates database functions to replace N+1 queries with SQL aggregation

-- 1. Function to get material counts by status
CREATE OR REPLACE FUNCTION get_material_status_counts()
RETURNS TABLE (
  status text,
  count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    status,
    COUNT(*) as count
  FROM materials
  GROUP BY status;
$$;

-- 2. Function to get upload trends for last N days
CREATE OR REPLACE FUNCTION get_upload_trends(days integer DEFAULT 7)
RETURNS TABLE (
  date date,
  count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH date_series AS (
    SELECT
      CURRENT_DATE - (n || ' days')::interval AS date
    FROM generate_series(0, days - 1) AS n
  )
  SELECT
    ds.date::date,
    COUNT(m.id)
  FROM date_series ds
  LEFT JOIN materials m ON DATE(m.created_at) = ds.date
  GROUP BY ds.date
  ORDER BY ds.date ASC;
$$;

-- 3. Function to get top courses by material count with aggregated stats
CREATE OR REPLACE FUNCTION get_top_courses_by_materials(limit_count integer DEFAULT 5)
RETURNS TABLE (
  course_name text,
  material_count bigint,
  total_size bigint,
  total_downloads bigint,
  total_views bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.course_name,
    COUNT(m.id) as material_count,
    COALESCE(SUM(m.file_size), 0) as total_size,
    COALESCE(SUM(m.download_count), 0) as total_downloads,
    COALESCE(SUM(m.view_count), 0) as total_views
  FROM courses c
  LEFT JOIN materials m ON m.course_id = c.id AND m.status = 'approved'
  GROUP BY c.id, c.course_name
  HAVING COUNT(m.id) > 0
  ORDER BY material_count DESC
  LIMIT limit_count;
$$;

-- 4. Function to get total engagement metrics
CREATE OR REPLACE FUNCTION get_total_engagement()
RETURNS TABLE (
  total_downloads bigint,
  total_views bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(download_count), 0) as total_downloads,
    COALESCE(SUM(view_count), 0) as total_views
  FROM materials;
$$;

-- 5. Function to get user stats by role
CREATE OR REPLACE FUNCTION get_user_stats_by_role()
RETURNS TABLE (
  role text,
  count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    role,
    COUNT(*) as count
  FROM profiles
  GROUP BY role;
$$;

-- 6. Function to get new users in time period
CREATE OR REPLACE FUNCTION get_new_users(days integer DEFAULT 7)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM profiles
  WHERE created_at >= CURRENT_DATE - (days || ' days')::interval;
$$;

-- 7. Function to get user activity trends
CREATE OR REPLACE FUNCTION get_user_activity_trends(days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  new_users bigint,
  active_users bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH date_series AS (
    SELECT
      CURRENT_DATE - (n || ' days')::interval AS date
    FROM generate_series(0, days - 1) AS n
  )
  SELECT
    ds.date::date,
    COUNT(DISTINCT p.id) FILTER (WHERE DATE(p.created_at) = ds.date) as new_users,
    -- Active users = users who uploaded, downloaded, or viewed materials on that day
    COUNT(DISTINCT m.uploaded_by) FILTER (WHERE DATE(m.created_at) = ds.date) as active_users
  FROM date_series ds
  LEFT JOIN profiles p ON DATE(p.created_at) = ds.date
  LEFT JOIN materials m ON DATE(m.created_at) = ds.date
  GROUP BY ds.date
  ORDER BY ds.date ASC;
$$;

-- Create indexes for frequently queried columns to speed up these operations
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_download_count ON materials(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_materials_view_count ON materials(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_materials_status_created_at ON materials(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_status_downloads ON materials(status, download_count DESC);
CREATE INDEX IF NOT EXISTS idx_materials_status_views ON materials(status, view_count DESC);

-- Analyze tables to update statistics for query planner
ANALYZE materials;
ANALYZE profiles;
ANALYZE courses;
