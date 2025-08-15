import { supabase } from './supabase'

export interface WeightLossDetail {
  email: string
  display_name: string
  first_weight: number
  last_weight: number
  weight_loss: number
  weight_loss_percentage: number
}

export interface GroupWeightLossResult {
  members: WeightLossDetail[]
  total_weight_lost: number
}

/**
 * Calculate total weight loss for a group using the provided SQL logic
 */
export const calculateGroupWeightLoss = async (groupId: string): Promise<GroupWeightLossResult> => {
  try {
    // Execute the complex query to get weight loss details for all group members
    const { data, error } = await supabase.rpc('get_group_weight_loss', {
      group_id: groupId
    })

    if (error) {
      console.error('Error calculating group weight loss:', error)
      throw error
    }

    return data || { members: [], total_weight_lost: 0 }
  } catch (error) {
    console.error('Error in calculateGroupWeightLoss:', error)
    return { members: [], total_weight_lost: 0 }
  }
}

/**
 * Update the total_weight_lost field for a group when it becomes inactive
 */
export const updateGroupTotalWeightLoss = async (groupId: string): Promise<boolean> => {
  try {
    const result = await calculateGroupWeightLoss(groupId)
    
    const { error } = await supabase
      .from('groups')
      .update({ total_weight_lost: result.total_weight_lost })
      .eq('id', groupId)

    if (error) {
      console.error('Error updating group total weight loss:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateGroupTotalWeightLoss:', error)
    return false
  }
}

/**
 * Check if a group is inactive (has an end_date in the past)
 */
export const isGroupInactive = (endDate: string | null): boolean => {
  if (!endDate) return false
  return new Date(endDate) < new Date()
}