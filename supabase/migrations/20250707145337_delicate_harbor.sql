/*
  # Remove display_name redundancy from group_members table

  1. Schema Changes
    - Remove `display_name` column from group_members table
    - Update all queries to fetch display_name from profiles table instead

  2. Security
    - No changes to existing RLS policies needed
    - All existing functionality maintained through joins
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