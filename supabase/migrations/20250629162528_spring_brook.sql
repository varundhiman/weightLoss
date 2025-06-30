/*
  # Fix Groups Table INSERT Policy

  1. Security Changes
    - Drop the existing INSERT policy for groups table that uses `uid()`
    - Create a new INSERT policy that uses `auth.uid()` for proper authentication
    - Ensure authenticated users can create groups where they are the creator

  This fixes the "new row violates row-level security policy" error when creating groups.
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Create a new INSERT policy with correct authentication function
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);