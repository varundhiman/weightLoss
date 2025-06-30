/*
  # Fix Groups INSERT Policy

  1. Security Changes
    - Drop existing INSERT policy for groups table that uses incorrect uid() function
    - Create new INSERT policy using correct auth.uid() function
    - Ensure authenticated users can create groups where they are the creator

  This fixes the "new row violates row-level security policy" error when creating groups.
*/

-- Drop the existing policy that uses uid() (which doesn't exist)
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Create the correct policy using auth.uid()
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);