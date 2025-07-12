/*
  # Remove display_name redundancy from group_members table

  1. Schema Changes
    - Remove `display_name` column from group_members table
    - This eliminates redundancy since display_name is already in profiles table

  2. Data Integrity
    - The display_name will now be fetched from profiles table via joins
    - No data loss as profiles table maintains the authoritative display_name
*/

-- Remove display_name column from group_members table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE group_members DROP COLUMN display_name;
  END IF;
END $$;