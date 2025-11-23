-- Add is_private column to weight_entries table
ALTER TABLE weight_entries 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN weight_entries.is_private IS 'Whether this weight entry is private (not visible to groups) or public (visible to groups)';