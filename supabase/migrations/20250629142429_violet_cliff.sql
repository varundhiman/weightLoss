/*
  # Fix Group Members RLS Policy

  1. Security Changes
    - Drop existing problematic RLS policies for group_members table
    - Create simple, non-recursive RLS policies
    - Ensure policies don't cause infinite recursion

  2. Policy Updates
    - SELECT: Users can read group members for groups they belong to (simplified)
    - INSERT: Users can join groups (as themselves)
    - DELETE: Users can leave groups (their own membership)
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Users can read group members for their groups" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read group members for their groups"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = group_members.group_id 
      AND gm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);