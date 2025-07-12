/*
  # Update notification functions to work without display_name in group_members

  1. Function Updates
    - Update notify_group_member_change() to fetch display_name from profiles table
    - Update notify_weight_entry() to fetch display_name from profiles table
    - Update notify_new_message() to fetch display_name from profiles table

  2. Security
    - Functions maintain SECURITY DEFINER to access all necessary data
    - No changes to RLS policies needed
*/

-- Update group member change notification function
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
    -- Get member's display name from profiles table
    SELECT display_name INTO member_name FROM profiles WHERE id = NEW.user_id;
    
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
    -- Get member's display name from profiles table
    SELECT display_name INTO member_name FROM profiles WHERE id = OLD.user_id;
    
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

-- Update weight entry notification function
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
  -- Get user's display name from profiles table
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

-- Update message notification function
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
  -- Get user's display name from profiles table and group name
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