/*
  # Add Group Start and End Dates

  1. Schema Changes
    - Add `start_date` column to groups table (optional)
    - Add `end_date` column to groups table (optional)
    - Both dates are timestamptz and nullable

  2. Security
    - No changes to existing RLS policies needed
    - Group creators can already update their groups
*/

-- Add start_date and end_date columns to groups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE groups ADD COLUMN start_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE groups ADD COLUMN end_date timestamptz;
  END IF;
END $$;