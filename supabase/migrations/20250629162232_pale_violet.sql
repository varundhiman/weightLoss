/*
  # Fix infinite recursion in group_members RLS policy

  1. Policy Changes
    - Drop the existing recursive SELECT policy on group_members
    - Create a new, simpler SELECT policy that allows users to see their own memberships
    - Create a separate policy for seeing other members in the same groups

  2. Security
    - Users can see their own group memberships
    - Users can see other members in groups they belong to (non-recursive approach)
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can read group members for their groups" ON group_members;

-- Create a simple policy for users to see their own memberships
CREATE POLICY "Users can read own memberships"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create a policy for users to see other members in their groups
-- This uses a function to avoid recursion
CREATE OR REPLACE FUNCTION user_groups()
RETURNS TABLE(group_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT gm.group_id 
  FROM group_members gm 
  WHERE gm.user_id = auth.uid();
$$;

CREATE POLICY "Users can read members of their groups"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (group_id IN (SELECT user_groups.group_id FROM user_groups()));