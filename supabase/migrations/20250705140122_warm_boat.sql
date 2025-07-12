/*
  # Add Height to Profiles

  1. Schema Changes
    - Add `height` column to profiles table (in centimeters)
    - Remove `initial_weight` column as we're transitioning to height-based profiles
    - Update existing data if needed

  2. Security
    - No changes to existing RLS policies needed
    - Users can already update their own profiles
*/

-- Add height column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'height'
  ) THEN
    ALTER TABLE profiles ADD COLUMN height numeric;
  END IF;
END $$;

-- Remove initial_weight column if it exists (transitioning away from weight-based to height-based)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'initial_weight'
  ) THEN
    ALTER TABLE profiles DROP COLUMN initial_weight;
  END IF;
END $$;