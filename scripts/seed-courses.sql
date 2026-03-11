-- Seed courses table with all available courses
-- This script should be run in the Neon SQL Editor

INSERT INTO courses (cid, course_name) VALUES
  (1, 'Data Structures & Algorithms'),
  (2, 'Python Programming'),
  (3, 'English Proficiency'),
  (4, 'RDBMS & SQL'),
  (5, 'HTML CSS JavaScript'),
  (6, 'Machine Learning'),
  (7, 'System Design'),
  (8, 'AI Fundamentals'),
  (9, 'Software Architecture'),
  (10, 'Competitive Programming'),
  (11, 'Blockchain Basics'),
  (12, 'Node.js Advanced'),
  (13, 'Deep Learning'),
  (14, 'Backend Engineering'),
  (15, 'Cloud Computing'),
  (16, 'DevOps Engineering'),
  (17, 'Cybersecurity Basics'),
  (18, 'Data Engineering'),
  (19, 'Distributed Systems'),
  (20, 'React Advanced')
ON CONFLICT (cid) DO NOTHING;
