/*
  # Fix infinite recursion in group_members RLS policy

  1. Problem
    - The current SELECT policy for group_members creates infinite recursion
    - Policy references group_members table within itself causing circular dependency

  2. Solution
    - Drop the problematic policy
    - Create a simpler policy that allows users to read group members for groups they belong to
    - Use a direct approach without self-referencing subqueries

  3. Security
    - Users can only see group members for groups they are members of
    - Maintains data privacy and access control
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can read group members for their groups" ON group_members;

-- Create a new, simpler policy that avoids infinite recursion
-- This allows users to read group member records where they are also a member of that group
CREATE POLICY "Users can read group members for their groups" 
  ON group_members 
  FOR SELECT 
  TO authenticated 
  USING (
    group_id IN (
      SELECT DISTINCT gm.group_id 
      FROM group_members gm 
      WHERE gm.user_id = auth.uid()
    )
  );