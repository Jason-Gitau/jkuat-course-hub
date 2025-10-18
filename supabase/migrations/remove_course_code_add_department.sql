-- Remove course_code and add department column to courses table
-- Courses don't have codes, only units/subjects do

-- Add department column first
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS department TEXT;

-- Update existing courses to have a default department
UPDATE courses
SET department = 'General'
WHERE department IS NULL;

-- Remove course_code column
ALTER TABLE courses
DROP COLUMN IF EXISTS course_code;

-- Add comment to clarify
COMMENT ON TABLE courses IS 'Academic programs/degrees (e.g., BSc Civil Engineering). Only units/subjects have codes, not courses.';
COMMENT ON COLUMN courses.department IS 'Department offering this course (e.g., Civil Engineering, Computer Science)';
