/*
  # Enable Group Creator to Delete Groups

  1. Security Changes
    - Add DELETE policy for groups table
    - Allow group creators to delete their own groups
    - Ensure only the creator (created_by) can delete the group

  2. Policy Details
    - DELETE policy checks that auth.uid() matches created_by field
    - Maintains security by preventing unauthorized group deletion
*/

-- Add DELETE policy for groups table
CREATE POLICY "Group creators can delete their groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);