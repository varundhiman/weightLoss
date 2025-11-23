/*
  # Update Teams Policy
  
  1. Changes
    - Update RLS policy for `teams` table to allow any authenticated user to view teams.
    - This is necessary so users can see available teams when joining a group.
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can read teams for their groups" ON teams;

-- Create a new policy allowing all authenticated users to read teams
CREATE POLICY "Authenticated users can read teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);
