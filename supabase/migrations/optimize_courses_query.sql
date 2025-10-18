-- Create a function to get courses with material counts in a single efficient query
-- This eliminates the N+1 query problem

CREATE OR REPLACE FUNCTION get_courses_with_material_counts()
RETURNS TABLE (
  id UUID,
  course_code TEXT,
  course_name TEXT,
  description TEXT,
  "materialsCount" BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.id,
    c.course_code,
    c.course_name,
    c.description,
    COALESCE(COUNT(m.id) FILTER (WHERE m.status = 'approved'), 0) AS "materialsCount"
  FROM courses c
  LEFT JOIN materials m ON m.course_id = c.id
  GROUP BY c.id, c.course_code, c.course_name, c.description
  ORDER BY c.course_code;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_courses_with_material_counts() TO authenticated, anon;
