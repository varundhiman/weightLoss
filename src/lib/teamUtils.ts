import { supabase } from './supabase'

export interface Team {
    id: string
    group_id: string
    name: string
    color: string
    created_at: string
}

export interface TeamWithMembers extends Team {
    member_count: number
    members?: {
        user_id: string
        display_name: string
    }[]
}

// Predefined color palette for teams
export const TEAM_COLORS = [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
]

/**
 * Get all teams for a specific group
 */
export const getTeamsForGroup = async (groupId: string): Promise<TeamWithMembers[]> => {
    const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

    if (error) throw error

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
        (teams || []).map(async (team) => {
            const { count } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', team.id)

            return {
                ...team,
                member_count: count || 0
            }
        })
    )

    return teamsWithCounts
}

/**
 * Create a team for a group
 */
export const createTeam = async (
    groupId: string,
    name: string,
    color: string
): Promise<Team> => {
    const { data, error } = await supabase
        .from('teams')
        .insert({
            group_id: groupId,
            name,
            color
        })
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Create multiple teams for a group
 */
export const createTeams = async (
    groupId: string,
    teams: { name: string; color: string }[]
): Promise<Team[]> => {
    const { data, error } = await supabase
        .from('teams')
        .insert(
            teams.map(team => ({
                group_id: groupId,
                name: team.name,
                color: team.color
            }))
        )
        .select()

    if (error) throw error
    return data || []
}

/**
 * Update a team
 */
export const updateTeam = async (
    teamId: string,
    updates: { name?: string; color?: string }
): Promise<Team> => {
    const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Delete a team
 */
export const deleteTeam = async (teamId: string): Promise<void> => {
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

    if (error) throw error
}

/**
 * Assign a member to a team
 */
export const assignMemberToTeam = async (
    userId: string,
    groupId: string,
    teamId: string | null
): Promise<void> => {
    const { error } = await supabase
        .from('group_members')
        .update({ team_id: teamId })
        .eq('user_id', userId)
        .eq('group_id', groupId)

    if (error) throw error
}

/**
 * Check if a group is a team challenge
 */
export const isTeamChallenge = async (groupId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('groups')
        .select('is_team_challenge')
        .eq('id', groupId)
        .single()

    if (error) throw error
    return data?.is_team_challenge || false
}

/**
 * Get team members for a specific team
 */
export const getTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
        .from('group_members')
        .select(`
      user_id,
      display_name,
      profiles!inner (
        display_name
      )
    `)
        .eq('team_id', teamId)

    if (error) throw error
    return data || []
}

/**
 * Calculate team aggregate statistics
 */
export interface TeamStats {
    team_id: string
    team_name: string
    team_color: string
    member_count: number
    average_change: number
    total_entries: number
    best_change: number
    combined_progress: number
}

export const calculateTeamStats = (
    team: TeamWithMembers,
    memberProgress: Array<{
        user_id: string
        latest_change: number
        total_entries: number
        best_change: number
    }>
): TeamStats => {
    const teamMembers = memberProgress.filter(m =>
        team.members?.some(tm => tm.user_id === m.user_id)
    )

    if (teamMembers.length === 0) {
        return {
            team_id: team.id,
            team_name: team.name,
            team_color: team.color,
            member_count: 0,
            average_change: 0,
            total_entries: 0,
            best_change: 0,
            combined_progress: 0
        }
    }

    const average_change = teamMembers.reduce((sum, m) => sum + m.latest_change, 0) / teamMembers.length
    const total_entries = teamMembers.reduce((sum, m) => sum + m.total_entries, 0)
    const best_change = Math.min(...teamMembers.map(m => m.best_change))
    const combined_progress = teamMembers.reduce((sum, m) => sum + m.latest_change, 0)

    return {
        team_id: team.id,
        team_name: team.name,
        team_color: team.color,
        member_count: teamMembers.length,
        average_change,
        total_entries,
        best_change,
        combined_progress
    }
}
