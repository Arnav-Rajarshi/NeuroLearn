-- Migration: Add known_topics column to course_preferences table
-- Description: Store user's known topics in the database for proper filtering

ALTER TABLE course_preferences 
ADD COLUMN IF NOT EXISTS known_topics JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_preferences_known_topics 
ON course_preferences USING GIN (known_topics);
