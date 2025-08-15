-- Function to calculate group weight loss based on the provided query
CREATE OR REPLACE FUNCTION get_group_weight_loss(group_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH UserWeightExtremes AS (
    SELECT 
      we1.user_id,
      (SELECT weight 
       FROM weight_entries we2 
       WHERE we2.user_id = we1.user_id 
       ORDER BY created_at ASC 
       LIMIT 1) AS first_weight,
      (SELECT weight 
       FROM weight_entries we2 
       WHERE we2.user_id = we1.user_id 
       ORDER BY created_at DESC 
       LIMIT 1) AS last_weight
    FROM weight_entries we1
    WHERE we1.user_id IN (
      SELECT gm.user_id 
      FROM group_members gm 
      WHERE gm.group_id = get_group_weight_loss.group_id
    )
    GROUP BY we1.user_id
  ), 
  WeightLossDetails AS (
    SELECT 
      p.email,
      p.display_name,
      uwe.first_weight,
      uwe.last_weight,
      ROUND(uwe.first_weight - uwe.last_weight, 2) AS weight_loss,
      ROUND((uwe.first_weight - uwe.last_weight) / uwe.first_weight * 100, 2) AS weight_loss_percentage
    FROM UserWeightExtremes uwe
    JOIN profiles p ON uwe.user_id = p.id
    JOIN group_members gm ON p.id = gm.user_id
    WHERE uwe.first_weight > uwe.last_weight 
      AND gm.group_id = get_group_weight_loss.group_id
  )
  SELECT json_build_object(
    'members', COALESCE(json_agg(
      json_build_object(
        'email', email,
        'display_name', display_name,
        'first_weight', first_weight,
        'last_weight', last_weight,
        'weight_loss', weight_loss,
        'weight_loss_percentage', weight_loss_percentage
      ) ORDER BY weight_loss DESC
    ), '[]'::json),
    'total_weight_lost', COALESCE((SELECT ROUND(SUM(weight_loss), 2) FROM WeightLossDetails), 0)
  ) INTO result
  FROM WeightLossDetails;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;