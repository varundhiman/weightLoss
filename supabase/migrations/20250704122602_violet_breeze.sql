/*
  # Weight Reminder System

  1. New Tables
    - `reminder_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `group_id` (uuid, foreign key to groups)
      - `reminder_type` (text) - type of reminder sent
      - `sent_at` (timestamp)
      - `email_sent` (boolean) - whether email was successfully sent

  2. Security
    - Enable RLS on reminder_logs table
    - Add policies for system access to reminder data
    - Users can read their own reminder logs

  3. Functions
    - Function to check users who need reminders
    - Function to send reminder emails
*/

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL DEFAULT 'weight_logging',
  sent_at timestamptz DEFAULT now(),
  email_sent boolean DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Reminder logs policies
CREATE POLICY "Users can read own reminder logs"
  ON reminder_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert reminder logs"
  ON reminder_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_group_id ON reminder_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- Function to get users who need weight logging reminders
CREATE OR REPLACE FUNCTION get_users_needing_reminders()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_display_name text,
  group_id uuid,
  group_name text,
  days_since_last_entry integer,
  last_reminder_sent timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_last_entries AS (
    SELECT 
      gm.user_id,
      gm.group_id,
      MAX(we.created_at) as last_entry_date
    FROM group_members gm
    LEFT JOIN weight_entries we ON gm.user_id = we.user_id
    GROUP BY gm.user_id, gm.group_id
  ),
  user_last_reminders AS (
    SELECT 
      user_id,
      group_id,
      MAX(sent_at) as last_reminder_sent
    FROM reminder_logs
    WHERE reminder_type = 'weight_logging'
    GROUP BY user_id, group_id
  )
  SELECT 
    ule.user_id,
    p.email as user_email,
    p.display_name as user_display_name,
    ule.group_id,
    g.name as group_name,
    CASE 
      WHEN ule.last_entry_date IS NULL THEN 999 -- Never logged
      ELSE EXTRACT(days FROM (now() - ule.last_entry_date))::integer
    END as days_since_last_entry,
    ulr.last_reminder_sent
  FROM user_last_entries ule
  JOIN profiles p ON ule.user_id = p.id
  JOIN groups g ON ule.group_id = g.id
  LEFT JOIN user_last_reminders ulr ON ule.user_id = ulr.user_id AND ule.group_id = ulr.group_id
  WHERE 
    -- User hasn't logged weight in 5+ days
    (
      ule.last_entry_date IS NULL OR 
      ule.last_entry_date < (now() - interval '5 days')
    )
    -- No reminder sent in last 4 days
    AND (
      ulr.last_reminder_sent IS NULL OR 
      ulr.last_reminder_sent < (now() - interval '4 days')
    )
    -- Group is currently active (between start and end dates if set)
    AND (
      g.start_date IS NULL OR g.start_date <= now()
    )
    AND (
      g.end_date IS NULL OR g.end_date >= now()
    );
$$;

-- Function to log a reminder being sent
CREATE OR REPLACE FUNCTION log_reminder_sent(
  p_user_id uuid,
  p_group_id uuid,
  p_reminder_type text DEFAULT 'weight_logging',
  p_email_sent boolean DEFAULT true
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO reminder_logs (user_id, group_id, reminder_type, email_sent)
  VALUES (p_user_id, p_group_id, p_reminder_type, p_email_sent)
  RETURNING id;
$$;