/*
  # Add Team Challenge Support

  1. Changes to groups table
    - Add `is_team_challenge` boolean column (defaults to false)
  
  2. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to groups)
      - `name` (text)
      - `color` (text) - hex color code for UI
      - `created_at` (timestamp)
  
  3. Changes to group_members table
    - Add `team_id` (uuid, nullable, foreign key to teams)
  
  4. Security
    - Enable RLS on teams table
    - Add policies for team access
*/

-- Add is_team_challenge column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_team_challenge boolean DEFAULT false NOT NULL;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add team_id to group_members table
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Enable Row Level Security on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Teams policies: Users can read teams for groups they belong to
DROP POLICY IF EXISTS "Users can read teams for their groups" ON teams;
CREATE POLICY "Users can read teams for their groups"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Group admins can create teams
DROP POLICY IF EXISTS "Group admins can create teams" ON teams;
CREATE POLICY "Group admins can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Group admins can update teams
DROP POLICY IF EXISTS "Group admins can update teams" ON teams;
CREATE POLICY "Group admins can update teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Group admins can delete teams
DROP POLICY IF EXISTS "Group admins can delete teams" ON teams;
CREATE POLICY "Group admins can delete teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Update group_members policy to allow admins to update team assignments
DROP POLICY IF EXISTS "Group admins can update member teams" ON group_members;

CREATE POLICY "Group admins can update member teams"
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_group_id ON teams(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_team_id ON group_members(team_id);
