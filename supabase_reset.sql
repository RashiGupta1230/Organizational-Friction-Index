-- ==============================================================================
-- Org X-Ray (OFI Analyzer Platform) - Complete Database Reset Script
-- WARNING: This will drop all existing data and recreate the schema from scratch.
-- ==============================================================================

-- 1. DROP EXISTING TABLES (In reverse dependency order if applicable)
DROP TABLE IF EXISTS workflow_tasks CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS time_clock CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS training_completions CASCADE;
DROP TABLE IF EXISTS knowledge_docs CASCADE;
DROP TABLE IF EXISTS org_teams CASCADE;
DROP TABLE IF EXISTS org_users CASCADE;
DROP TABLE IF EXISTS punches CASCADE;

-- ==============================================================================
-- 2. CREATE FRESH TABLES
-- ==============================================================================

-- A. HR Hiring Pipeline
CREATE TABLE candidates (
  id TEXT PRIMARY KEY DEFAULT 'C-' || substr(gen_random_uuid()::text, 1, 8),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT DEFAULT 'General',
  hiring_manager TEXT,
  start_date DATE,
  stage TEXT NOT NULL DEFAULT 'Applied',
  it_provisioned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Cross-Department Tasks
CREATE TABLE workflow_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  dept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  source TEXT NOT NULL DEFAULT 'Manual',
  linked_candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  checklist JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. SLA-Tracked Approvals
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  requester TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Infrastructure',
  status TEXT NOT NULL DEFAULT 'Pending',
  sla_days INT NOT NULL DEFAULT 5,
  age INT NOT NULL DEFAULT 0,
  dept TEXT NOT NULL,
  is_god_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Payroll Reconciliation Master Table
CREATE TABLE time_clock (
  emp_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  expected_hours INT NOT NULL DEFAULT 40,
  actual_hours INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Needs Review',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. Immutable Audit Trail
CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Company Announcements Feed
CREATE TABLE feed_posts (
  id BIGSERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Announcement',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Work Chat
CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'general',
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_channel ON chat_messages(channel);

-- H. Weekly Shift Schedule
CREATE TABLE shifts (
  id BIGSERIAL PRIMARY KEY,
  day_index INT NOT NULL,
  text TEXT NOT NULL,
  assigned_user TEXT NOT NULL DEFAULT 'Unassigned',
  dept TEXT NOT NULL DEFAULT 'Operations',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. Employee Training Progress
CREATE TABLE training_completions (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  module_id INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, module_id)
);

-- J. Knowledge Base
CREATE TABLE knowledge_docs (
  id TEXT PRIMARY KEY DEFAULT 'DOC-' || substr(gen_random_uuid()::text, 1, 8),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- K. Organization Teams
CREATE TABLE org_teams (
  id TEXT PRIMARY KEY DEFAULT 'TEAM-' || substr(gen_random_uuid()::text, 1, 8),
  name TEXT NOT NULL,
  branding_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- L. Organization Users
CREATE TABLE org_users (
  id TEXT PRIMARY KEY DEFAULT 'USR-' || substr(gen_random_uuid()::text, 1, 8),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Employee',
  team_id TEXT REFERENCES org_teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- M. Time Clock Punches
CREATE TABLE punches (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. ENABLE REAL-TIME SUBSCRIPTIONS
-- ==============================================================================
-- Required for the Chat and Feed dashboards to instantly update.
ALTER PUBLICATION supabase_realtime ADD TABLE feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ==============================================================================
-- 4. DISABLE ROW LEVEL SECURITY (RLS) FOR DEVELOPMENT
-- ==============================================================================
-- As requested in your context document, we are bypassing RLS for fast iteration.
-- In production, you would remove this section and write strict Policies.

ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_docs DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE punches DISABLE ROW LEVEL SECURITY;

GRANT ALL ON candidates TO anon, authenticated;
GRANT ALL ON workflow_tasks TO anon, authenticated;
GRANT ALL ON approvals TO anon, authenticated;
GRANT ALL ON time_clock TO anon, authenticated;
GRANT ALL ON system_logs TO anon, authenticated;
GRANT ALL ON feed_posts TO anon, authenticated;
GRANT ALL ON chat_messages TO anon, authenticated;
GRANT ALL ON shifts TO anon, authenticated;
GRANT ALL ON training_completions TO anon, authenticated;
GRANT ALL ON knowledge_docs TO anon, authenticated;
GRANT ALL ON org_teams TO anon, authenticated;
GRANT ALL ON org_users TO anon, authenticated;
GRANT ALL ON punches TO anon, authenticated;

-- ==============================================================================
-- 5. STORAGE BUCKETS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge_base', 'knowledge_base', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies (Wide open for smooth operation)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'knowledge_base');

-- ==============================================================================
-- 6. INSERT SEED DATA (OPTIONAL)
-- ==============================================================================

-- Seed Candidates
INSERT INTO candidates (id, name, role, stage) VALUES
('C-1001', 'Alice Johnson', 'Frontend Dev', 'Onboarding'),
('C-1002', 'Bob Smith', 'Marketing Lead', 'Active Employee'),
('C-1003', 'Charlie Davis', 'Sales Exec', 'Interviewing');

-- Seed Time Clock (Payroll Testing)
INSERT INTO time_clock (emp_id, name, dept, expected_hours, actual_hours, status) VALUES
('EMP-101', 'David Lee', 'Operations', 40, 40, 'Cleared'),
('EMP-102', 'Emma Watson', 'Finance', 40, 32, 'Needs Review'),  -- Discrepancy (Missing hours)
('EMP-103', 'Frank Miller', 'IT', 40, 48, 'Needs Review');      -- Discrepancy (Overtime)

-- Seed Initial Approvals
INSERT INTO approvals (id, title, requester, type, status, sla_days, age, dept) VALUES
('APP-001', 'AWS EC2 Instance Upgrade', 'frank.m@org.test', 'Infrastructure', 'Pending', 2, 5, 'IT'); -- Breached SLA

-- Seed Initial Shifts
INSERT INTO shifts (day_index, text, assigned_user, dept) VALUES
(1, 'Morning (9-5)', 'David Lee', 'Operations'),
(1, 'Evening (5-1)', 'Unassigned', 'Operations'),
(2, 'Morning (9-5)', 'David Lee', 'Operations');

-- Log Initialization
INSERT INTO system_logs (text, source) VALUES
('System successfully initialized and reset', 'Admin');

-- ==============================================================================
-- 6. SLA AGE AUTO-INCREMENT — Fix #20
-- Run this once to create a Postgres function + pg_cron daily job.
-- This fixes the issue where approvals.age never increments automatically.
-- ==============================================================================

-- 6a. Create the increment function
CREATE OR REPLACE FUNCTION increment_approval_age()
RETURNS void AS $$
BEGIN
  UPDATE approvals
  SET age = age + 1
  WHERE status NOT IN ('Approved', 'Rejected');
END;
$$ LANGUAGE plpgsql;

-- 6b. Schedule it to run daily at midnight UTC (requires pg_cron extension)
-- Enable pg_cron in Supabase Dashboard → Extensions → pg_cron
-- Then uncomment and run:
-- SELECT cron.schedule('daily-sla-increment', '0 0 * * *', $$SELECT increment_approval_age();$$);

-- ==============================================================================
-- 7. REQUIRED .env.local KEYS — paste these into your web-client/.env.local
-- ==============================================================================
-- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
-- CLERK_SECRET_KEY=sk_test_...
-- NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
--
-- Get Supabase keys from: Project Settings → API → Project URL + anon key
-- Get Clerk keys from: dashboard.clerk.com → API Keys

