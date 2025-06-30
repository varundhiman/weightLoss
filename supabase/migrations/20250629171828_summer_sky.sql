/*
  # Fix Groups INSERT Policy

  1. Security Changes
    - Drop existing INSERT policy for groups table
    - Create new INSERT policy that properly uses auth.uid() function
    - Ensure authenticated users can create groups where they are the creator

  The issue was that the existing policy was using uid() instead of auth.uid()
  which is the correct function to get the current authenticated user's ID.
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Create the correct INSERT policy using auth.uid()
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);