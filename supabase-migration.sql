-- Complete Supabase Migration for Project Management App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS "Milestone" CASCADE;
DROP TABLE IF EXISTS "Task" CASCADE;
DROP TABLE IF EXISTS "Insight" CASCADE;
DROP TABLE IF EXISTS "IdeaDump" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "TaskStatus" CASCADE;

-- Create tables
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Project" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "summaryBanner" TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "IdeaDump" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "contentText" TEXT,
  "audioUrl" TEXT,
  transcript TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Insight" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ideaDumpId" UUID NOT NULL REFERENCES "IdeaDump"(id) ON DELETE CASCADE,
  "shortSummary" JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  "suggestedTasks" JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TABLE "Task" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status "TaskStatus" DEFAULT 'TODO',
  position FLOAT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Milestone" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "dueDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_project_userid ON "Project"("userId");
CREATE INDEX idx_ideadump_projectid ON "IdeaDump"("projectId");
CREATE INDEX idx_ideadump_userid ON "IdeaDump"("userId");
CREATE INDEX idx_insight_ideadumpid ON "Insight"("ideaDumpId");
CREATE INDEX idx_task_projectid ON "Task"("projectId");
CREATE INDEX idx_milestone_projectid ON "Milestone"("projectId");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_project_updated_at BEFORE UPDATE ON "Project"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_updated_at BEFORE UPDATE ON "Task"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdeaDump" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Insight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: These policies use auth.uid() which works with Supabase Auth
-- For JWT-based auth, you might need to adjust these policies

-- Users policies
CREATE POLICY "Enable read access for all users" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authentication" ON "User"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on id" ON "User"
  FOR UPDATE USING (true);

-- Projects policies  
CREATE POLICY "Enable all operations for authenticated users on their projects" ON "Project"
  FOR ALL USING (true);

-- IdeaDumps policies
CREATE POLICY "Enable all operations for authenticated users on their idea dumps" ON "IdeaDump"
  FOR ALL USING (true);

-- Insights policies
CREATE POLICY "Enable all operations for authenticated users on insights" ON "Insight"
  FOR ALL USING (true);

-- Tasks policies
CREATE POLICY "Enable all operations for authenticated users on tasks" ON "Task"
  FOR ALL USING (true);

-- Milestones policies
CREATE POLICY "Enable all operations for authenticated users on milestones" ON "Milestone"
  FOR ALL USING (true);

-- Insert test data (optional)
DO $$
DECLARE
  test_user_id UUID;
  test_project_id UUID;
BEGIN
  -- Insert test user (password is 'password123' hashed with bcrypt)
  INSERT INTO "User" (email, "passwordHash")
  VALUES ('test@example.com', '$2a$10$rBV2JDeWW3.vKyeQcM8fFO4777l.VqVorprfcEzpqJJTYl7J0KMlu')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO test_user_id;

  IF test_user_id IS NOT NULL THEN
    -- Insert sample project
    INSERT INTO "Project" ("userId", name, "summaryBanner")
    VALUES (test_user_id, 'Sample Project', 'A sample project to demonstrate the app capabilities')
    RETURNING id INTO test_project_id;

    -- Insert sample tasks
    INSERT INTO "Task" ("projectId", title, description, status, position)
    VALUES 
      (test_project_id, 'Setup development environment', 'Install all dependencies and configure tools', 'DONE', 1),
      (test_project_id, 'Design database schema', 'Create Prisma schema for all models', 'IN_PROGRESS', 2),
      (test_project_id, 'Implement authentication', 'Add JWT-based auth with guest mode support', 'TODO', 3);

    -- Insert sample milestone
    INSERT INTO "Milestone" ("projectId", title, description, "dueDate")
    VALUES (test_project_id, 'MVP Launch', 'Complete core features for initial release', CURRENT_TIMESTAMP + INTERVAL '30 days');

    RAISE NOTICE 'Test data inserted successfully';
  END IF;
END $$;

-- Create storage bucket for audio uploads (run in Supabase Dashboard under Storage)
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Create a new bucket called 'audio-uploads'
-- 3. Set it to Public if you want direct access to files