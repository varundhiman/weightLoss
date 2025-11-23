import React, { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Users, Trophy, Calendar, Scale, Award } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { calculateGroupWeightLoss, isGroupInactive, WeightLossDetail } from '../../lib/groupUtils'

interface MemberProgress {
  user_id: string
  display_name: string
  team_id: string | null
  entries: {
    id: string
    percentage_change: number
    created_at: string
  }[]
  latest_change: number
  total_entries: number
  best_change: number
  days_active: number
}

interface TeamProgress {
  team_id: string
  team_name: string
  team_color: string
  member_count: number
  average_change: number
  total_entries: number
  best_change: number
  members: MemberProgress[]
}

interface GroupProgressProps {
  groupId: string
  groupName: string
}

export const GroupProgress: React.FC<GroupProgressProps> = ({ groupId, groupName }) => {
  const [membersProgress, setMembersProgress] = useState<MemberProgress[]>([])
  const [teamsProgress, setTeamsProgress] = useState<TeamProgress[]>([])
  const [isTeamChallenge, setIsTeamChallenge] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [groupStartDate, setGroupStartDate] = useState<string | null>(null)
  const [groupEndDate, setGroupEndDate] = useState<string | null>(null)
  const [totalWeightLost, setTotalWeightLost] = useState<number | null>(null)
  const [weightLossDetails, setWeightLossDetails] = useState<WeightLossDetail[]>([])
  const [userTeamId, setUserTeamId] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (groupId) {
      fetchGroupProgress()
    }
  }, [groupId])

  const fetchGroupProgress = async () => {
    try {
      // First, get the group's data including is_team_challenge
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('start_date, end_date, total_weight_lost, is_team_challenge')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError
      setGroupStartDate(groupData?.start_date || null)
      setGroupEndDate(groupData?.end_date || null)
      setTotalWeightLost(groupData?.total_weight_lost || null)
      setIsTeamChallenge(groupData?.is_team_challenge || false)

      // Check if group is inactive and calculate weight loss if needed
      const inactive = isGroupInactive(groupData?.end_date)
      if (inactive) {
        try {
          const weightLossResult = await calculateGroupWeightLoss(groupId)
          setWeightLossDetails(weightLossResult.members)

          // Update the database if total_weight_lost is not set
          if (groupData?.total_weight_lost === null && weightLossResult.total_weight_lost > 0) {
            await supabase
              .from('groups')
              .update({ total_weight_lost: weightLossResult.total_weight_lost })
              .eq('id', groupId)
            setTotalWeightLost(weightLossResult.total_weight_lost)
          }
        } catch (error) {
          console.error('Error calculating weight loss for inactive group:', error)
        }
      }

      // Get user's team ID if this is a team challenge
      if (groupData?.is_team_challenge && user) {
        const { data: userMembership } = await supabase
          .from('group_members')
          .select('team_id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single()

        setUserTeamId(userMembership?.team_id || null)
      }

      // Get all group members with their profile information and team
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          team_id,
          profiles!inner (
            display_name
          )
        `)
        .eq('group_id', groupId)

      if (membersError) throw membersError

      if (!members || members.length === 0) {
        setMembersProgress([])
        setTeamsProgress([])
        return
      }

      // Get weight entries for all members
      const memberIds = members.map(m => m.user_id)

      // Build the query - filter by start date if it exists and exclude private entries
      let query = supabase
        .from('weight_entries')
        .select('id, user_id, percentage_change, created_at')
        .in('user_id', memberIds)
        .eq('is_private', false) // Exclude private entries from group calculations
        .order('created_at', { ascending: true })

      // If group has a start date, only include entries from that date onwards
      if (groupData?.start_date) {
        query = query.gte('created_at', groupData.start_date)
      }

      const { data: entries, error: entriesError } = await query

      if (entriesError) throw entriesError

      // Group entries by user and calculate stats
      const progressData: MemberProgress[] = members.map(member => {
        const userEntries = entries?.filter(e => e.user_id === member.user_id) || []

        const latest_change = userEntries.length > 0
          ? userEntries[userEntries.length - 1].percentage_change
          : 0

        const best_change = userEntries.length > 0
          ? Math.min(...userEntries.map(e => e.percentage_change))
          : 0

        // Calculate days active since group start date or first entry
        let startDateForCalculation = groupData?.start_date
        if (!startDateForCalculation && userEntries.length > 0) {
          startDateForCalculation = userEntries[0].created_at
        }

        const days_active = startDateForCalculation
          ? Math.ceil((new Date().getTime() - new Date(startDateForCalculation).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          user_id: member.user_id,
          display_name: (member.profiles as any)?.display_name || 'User',
          team_id: member.team_id,
          entries: userEntries,
          latest_change,
          total_entries: userEntries.length,
          best_change,
          days_active
        }
      })

      // Sort by latest progress (best performers first)
      progressData.sort((a, b) => a.latest_change - b.latest_change)

      setMembersProgress(progressData)

      // If team challenge, calculate team stats
      if (groupData?.is_team_challenge) {
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, color')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })

        if (teamsError) throw teamsError

        const teamsData: TeamProgress[] = (teams || []).map(team => {
          const teamMembers = progressData.filter(m => m.team_id === team.id)

          if (teamMembers.length === 0) {
            return {
              team_id: team.id,
              team_name: team.name,
              team_color: team.color,
              member_count: 0,
              average_change: 0,
              total_entries: 0,
              best_change: 0,
              members: []
            }
          }

          const average_change = teamMembers.reduce((sum, m) => sum + m.latest_change, 0) / teamMembers.length
          const total_entries = teamMembers.reduce((sum, m) => sum + m.total_entries, 0)
          const best_change = Math.min(...teamMembers.map(m => m.best_change))

          return {
            team_id: team.id,
            team_name: team.name,
            team_color: team.color,
            member_count: teamMembers.length,
            average_change,
            total_entries,
            best_change,
            members: teamMembers
          }
        })

        // Sort teams by average change (best performing first)
        teamsData.sort((a, b) => a.average_change - b.average_change)
        setTeamsProgress(teamsData)
      }
    } catch (error) {
      console.error('Error fetching group progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const MemberChart: React.FC<{ member: MemberProgress }> = ({ member }) => {
    if (member.entries.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {groupStartDate
              ? `No progress data since ${format(new Date(groupStartDate), 'MMM d, yyyy')}`
              : 'No progress data yet'
            }
          </p>
        </div>
      )
    }

    const chartWidth = 300
    const chartHeight = 150
    const padding = 20

    const percentages = member.entries.map(e => e.percentage_change)
    const minPercentage = Math.min(0, Math.min(...percentages))
    const maxPercentage = Math.max(0, Math.max(...percentages))
    const range = Math.max(Math.abs(minPercentage), Math.abs(maxPercentage)) * 1.1 || 1

    const points = member.entries.map((entry, index) => {
      const x = padding + (index / (member.entries.length - 1 || 1)) * (chartWidth - 2 * padding)
      const y = padding + (1 - (entry.percentage_change + range) / (2 * range)) * (chartHeight - 2 * padding)
      return { x, y, entry }
    })

    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x} ${point.y}`
    }, '')

    const isPositive = member.latest_change >= 0

    return (
      <div className="relative">
        <svg width="100%" height="150" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${member.user_id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.6" />
              <stop offset="100%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Zero line */}
          <line
            x1={padding}
            y1={padding + (chartHeight - 2 * padding) / 2}
            x2={chartWidth - padding}
            y2={padding + (chartHeight - 2 * padding) / 2}
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* Main line */}
          {points.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke={isPositive ? "#EF4444" : "#10B981"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="white"
              stroke={isPositive ? "#EF4444" : "#10B981"}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const selectedMemberData = selectedMember
    ? membersProgress.find(m => m.user_id === selectedMember)
    : null

  const inactive = isGroupInactive(groupEndDate)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${inactive ? 'from-purple-500 to-pink-500' : 'from-green-500 to-blue-500'} rounded-full flex items-center justify-center`}>
            {inactive ? <Award className="w-5 h-5 text-white" /> : <Trophy className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Group Progress
              {inactive && <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Completed</span>}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{groupName} • {membersProgress.length} members</span>
              {groupStartDate && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(groupStartDate), 'MMM d, yyyy')}
                      {inactive && groupEndDate && ` - ${format(new Date(groupEndDate), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {selectedMember && (
          <button
            onClick={() => setSelectedMember(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to overview
          </button>
        )}
      </div>

      {/* Total Weight Loss Banner for Inactive Groups */}
      {inactive && (totalWeightLost !== null || weightLossDetails.length > 0) && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">
                  🎉 Group Challenge Complete!
                </h4>
                <p className="text-gray-600">
                  Total weight lost by the entire group
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-purple-600">
                {totalWeightLost?.toFixed(1) || weightLossDetails.reduce((sum, member) => sum + member.weight_loss, 0).toFixed(1)} lbs
              </div>
              <div className="text-sm text-purple-500 font-medium">
                Combined Weight Loss
              </div>
            </div>
          </div>

          {weightLossDetails.length > 0 && (
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 mb-3">Weight Loss Champions</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {weightLossDetails.slice(0, 6).map((member, index) => (
                  <div key={member.email} className="bg-white rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-purple-400'
                          }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{member.display_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-sm">-{member.weight_loss.toFixed(1)} lbs</div>
                        <div className="text-xs text-gray-500">{member.weight_loss_percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedMemberData ? (
        // Detailed view for selected member
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {selectedMemberData.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{selectedMemberData.display_name}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{selectedMemberData.total_entries} entries</span>
                <span>{selectedMemberData.days_active} days active</span>
                {groupStartDate && (
                  <span>since group start</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${selectedMemberData.latest_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {selectedMemberData.latest_change >= 0 ? '+' : ''}{selectedMemberData.latest_change.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Current</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-4">
              Progress Chart
              {groupStartDate && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Since {format(new Date(groupStartDate), 'MMM d, yyyy')})
                </span>
              )}
            </h5>
            <MemberChart member={selectedMemberData} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Entries</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{selectedMemberData.total_entries}</div>
              {groupStartDate && (
                <div className="text-xs text-blue-700 mt-1">Since group start</div>
              )}
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Best Progress</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {selectedMemberData.best_change.toFixed(1)}%
              </div>
              {groupStartDate && (
                <div className="text-xs text-green-700 mt-1">Since group start</div>
              )}
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Days Active</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{selectedMemberData.days_active}</div>
              {groupStartDate && (
                <div className="text-xs text-purple-700 mt-1">Since group start</div>
              )}
            </div>
          </div>

          {selectedMemberData.entries.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Recent Progress</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedMemberData.entries.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </span>
                    <span className={`font-medium ${entry.percentage_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {entry.percentage_change >= 0 ? '+' : ''}{entry.percentage_change.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Overview grid
        <div className="space-y-6">
          {(isTeamChallenge ? teamsProgress.length === 0 : membersProgress.length === 0) ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Progress Data</h4>
              <p className="text-gray-500">
                {groupStartDate
                  ? `Group members haven't tracked progress since ${format(new Date(groupStartDate), 'MMM d, yyyy')}`
                  : 'Group members haven\'t started tracking their progress yet'
                }
              </p>
            </div>
          ) : (
            <>
              {isTeamChallenge ? (
                // TEAM CHALLENGE LEADERBOARD
                <>
                  {/* Team Leaderboard */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Team Leaderboard
                      {groupStartDate && (
                        <span className="text-sm font-normal text-gray-500">
                          (Since {format(new Date(groupStartDate), 'MMM d, yyyy')})
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {teamsProgress.slice(0, 3).map((team, index) => (
                        <div
                          key={team.team_id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedTeam(team.team_id)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                            }`}>
                            {index + 1}
                          </div>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.team_color }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{team.team_name}</div>
                            <div className="text-sm text-gray-500">
                              {team.member_count} {team.member_count === 1 ? 'member' : 'members'} • {team.total_entries} total entries
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${team.average_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {team.average_change >= 0 ? '+' : ''}{team.average_change.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">avg</div>
                          </div>
                          <div className="flex items-center">
                            {team.average_change < 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Teams Grid */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">All Teams</h4>
                    <div className="space-y-4">
                      {teamsProgress.map((team) => {
                        const canViewMembers = team.members.some(m => m.user_id === user?.id) || userTeamId === team.team_id
                        return (
                          <div
                            key={team.team_id}
                            className="bg-gray-50 rounded-lg p-4 border-2"
                            style={{ borderColor: team.team_color + '40' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: team.team_color }} />
                                <div>
                                  <h5 className="font-semibold text-gray-900">{team.team_name}</h5>
                                  <p className="text-sm text-gray-500">
                                    {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-xl font-bold ${team.average_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  {team.average_change >= 0 ? '+' : ''}{team.average_change.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500">Average Progress</div>
                              </div>
                            </div>

                            {canViewMembers && team.members.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Team Members</h6>
                                <div className="space-y-2">
                                  {team.members.map((member) => (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center justify-between text-sm p-2 bg-white rounded cursor-pointer hover:bg-gray-50"
                                      onClick={() => setSelectedMember(member.user_id)}
                                    >
                                      <span className="font-medium text-gray-900">
                                        {member.display_name}
                                        {member.user_id === user?.id && (
                                          <span className="text-xs text-blue-600 ml-2">(You)</span>
                                        )}
                                      </span>
                                      <span className={`font-bold ${member.latest_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {member.latest_change >= 0 ? '+' : ''}{member.latest_change.toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!canViewMembers && (
                              <div className="mt-3 pt-3 border-t border-gray-200 text-center text-sm text-gray-500">
                                🔒 Join this team to see individual member stats
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                // INDIVIDUAL CHALLENGE LEADERBOARD (original)
                <>
                  {/* Leaderboard */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Progress Leaderboard
                      {groupStartDate && (
                        <span className="text-sm font-normal text-gray-500">
                          (Since {format(new Date(groupStartDate), 'MMM d, yyyy')})
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {membersProgress.slice(0, 3).map((member, index) => (
                        <div
                          key={member.user_id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedMember(member.user_id)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                            }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {member.display_name}
                              {member.user_id === user?.id && (
                                <span className="text-xs text-blue-600 ml-2">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.total_entries} entries • {member.days_active} days
                              {groupStartDate && ' since start'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${member.latest_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {member.latest_change >= 0 ? '+' : ''}{member.latest_change.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">current</div>
                          </div>
                          <div className="flex items-center">
                            {member.latest_change < 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Members Grid */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">All Members</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {membersProgress.map((member) => (
                        <div
                          key={member.user_id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedMember(member.user_id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">
                                  {member.display_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {member.display_name}
                                  {member.user_id === user?.id && (
                                    <span className="text-xs text-blue-600 ml-1">(You)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${member.latest_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {member.latest_change >= 0 ? '+' : ''}{member.latest_change.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          <MemberChart member={member} />

                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>{member.total_entries} entries</span>
                            <span>
                              {member.days_active} days
                              {groupStartDate && ' since start'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}