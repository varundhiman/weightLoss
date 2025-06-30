/*
  # Fix Groups RLS Policy

  1. Security Updates
    - Drop existing INSERT policy for groups table
    - Create new INSERT policy that properly handles authenticated users
    - Ensure the policy uses auth.uid() correctly for group creation

  2. Changes
    - Updated INSERT policy to use proper Supabase auth functions
    - Policy now allows authenticated users to create groups where they are the creator
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Create a new INSERT policy that works correctly
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);