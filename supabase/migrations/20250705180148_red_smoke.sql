/*
  # Notification System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `type` (text) - notification type
      - `title` (text) - notification title
      - `message` (text) - notification content
      - `data` (jsonb) - additional data
      - `read` (boolean) - read status
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on notifications table
    - Add policies for user access to their notifications

  3. Functions
    - Function to create notifications
    - Function to mark notifications as read
    - Function to get unread count
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET read = true 
  WHERE id = p_notification_id AND user_id = auth.uid()
  RETURNING true;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET read = true 
  WHERE user_id = auth.uid() AND read = false
  RETURNING true;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM notifications
  WHERE user_id = auth.uid() AND read = false;
$$;

-- Function to create group member notifications
CREATE OR REPLACE FUNCTION notify_group_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_name text;
  member_name text;
  notification_title text;
  notification_message text;
  member_record record;
BEGIN
  -- Get group name
  SELECT name INTO group_name FROM groups WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  IF TG_OP = 'INSERT' THEN
    -- Member joined
    member_name := NEW.display_name;
    notification_title := 'New Member Joined';
    notification_message := member_name || ' joined the group "' || group_name || '"';
    
    -- Notify all other members of the group
    FOR member_record IN 
      SELECT user_id FROM group_members 
      WHERE group_id = NEW.group_id AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        member_record.user_id,
        'member_joined',
        notification_title,
        notification_message,
        jsonb_build_object(
          'group_id', NEW.group_id,
          'group_name', group_name,
          'member_id', NEW.user_id,
          'member_name', member_name
        )
      );
    END LOOP;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Member left
    member_name := OLD.display_name;
    notification_title := 'Member Left Group';
    notification_message := member_name || ' left the group "' || group_name || '"';
    
    -- Notify all remaining members of the group
    FOR member_record IN 
      SELECT user_id FROM group_members 
      WHERE group_id = OLD.group_id AND user_id != OLD.user_id
    LOOP
      PERFORM create_notification(
        member_record.user_id,
        'member_left',
        notification_title,
        notification_message,
        jsonb_build_object(
          'group_id', OLD.group_id,
          'group_name', group_name,
          'member_id', OLD.user_id,
          'member_name', member_name
        )
      );
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for group member changes
DROP TRIGGER IF EXISTS trigger_group_member_notifications ON group_members;
CREATE TRIGGER trigger_group_member_notifications
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION notify_group_member_change();

-- Function to create weight entry notifications
CREATE OR REPLACE FUNCTION notify_weight_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  group_record record;
  member_record record;
  notification_title text;
  notification_message text;
  percentage_change_text text;
BEGIN
  -- Get user's display name
  SELECT display_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  
  -- Format percentage change
  IF NEW.percentage_change >= 0 THEN
    percentage_change_text := '+' || NEW.percentage_change::text || '%';
  ELSE
    percentage_change_text := NEW.percentage_change::text || '%';
  END IF;
  
  notification_title := 'Progress Update';
  notification_message := user_name || ' logged a weight entry (' || percentage_change_text || ')';
  
  -- Notify all group members (except the user who logged the entry)
  FOR group_record IN 
    SELECT gm.group_id, g.name as group_name
    FROM group_members gm
    JOIN groups g ON gm.group_id = g.id
    WHERE gm.user_id = NEW.user_id
  LOOP
    FOR member_record IN 
      SELECT user_id FROM group_members 
      WHERE group_id = group_record.group_id AND user_id != NEW.user_id
    LOOP
      PERFORM create_notification(
        member_record.user_id,
        'weight_entry',
        notification_title,
        notification_message,
        jsonb_build_object(
          'group_id', group_record.group_id,
          'group_name', group_record.group_name,
          'user_id', NEW.user_id,
          'user_name', user_name,
          'percentage_change', NEW.percentage_change,
          'entry_id', NEW.id
        )
      );
    END LOOP;
  END LOOP;
  
  -- Check for milestones and create milestone notifications
  IF NEW.percentage_change <= -5 AND NEW.percentage_change > -10 THEN
    PERFORM create_notification(
      NEW.user_id,
      'milestone',
      '🎉 Milestone Achieved!',
      'Congratulations! You''ve lost 5% of your starting weight!',
      jsonb_build_object('milestone_type', '5_percent_loss', 'percentage_change', NEW.percentage_change)
    );
  ELSIF NEW.percentage_change <= -10 AND NEW.percentage_change > -15 THEN
    PERFORM create_notification(
      NEW.user_id,
      'milestone',
      '🏆 Amazing Progress!',
      'Incredible! You''ve lost 10% of your starting weight!',
      jsonb_build_object('milestone_type', '10_percent_loss', 'percentage_change', NEW.percentage_change)
    );
  ELSIF NEW.percentage_change <= -15 THEN
    PERFORM create_notification(
      NEW.user_id,
      'milestone',
      '🌟 Outstanding Achievement!',
      'Phenomenal! You''ve lost 15% or more of your starting weight!',
      jsonb_build_object('milestone_type', '15_percent_loss', 'percentage_change', NEW.percentage_change)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for weight entry notifications
DROP TRIGGER IF EXISTS trigger_weight_entry_notifications ON weight_entries;
CREATE TRIGGER trigger_weight_entry_notifications
  AFTER INSERT ON weight_entries
  FOR EACH ROW EXECUTE FUNCTION notify_weight_entry();

-- Function to create message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  group_name text;
  member_record record;
  notification_title text;
  notification_message text;
  message_preview text;
BEGIN
  -- Get user's display name and group name
  SELECT display_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  SELECT name INTO group_name FROM groups WHERE id = NEW.group_id;
  
  -- Create message preview (first 50 characters)
  message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    message_preview := message_preview || '...';
  END IF;
  
  notification_title := 'New Message in ' || group_name;
  notification_message := user_name || ': ' || message_preview;
  
  -- Notify all other group members
  FOR member_record IN 
    SELECT user_id FROM group_members 
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
  LOOP
    PERFORM create_notification(
      member_record.user_id,
      'new_message',
      notification_title,
      notification_message,
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', group_name,
        'message_id', NEW.id,
        'sender_id', NEW.user_id,
        'sender_name', user_name
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS trigger_message_notifications ON messages;
CREATE TRIGGER trigger_message_notifications
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();