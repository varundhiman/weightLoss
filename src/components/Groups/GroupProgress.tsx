import React, { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Users, Trophy, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface MemberProgress {
  user_id: string
  display_name: string
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

interface GroupProgressProps {
  groupId: string
  groupName: string
}

export const GroupProgress: React.FC<GroupProgressProps> = ({ groupId, groupName }) => {
  const [membersProgress, setMembersProgress] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (groupId) {
      fetchGroupProgress()
    }
  }, [groupId])

  const fetchGroupProgress = async () => {
    try {
      // First, get all group members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, display_name')
        .eq('group_id', groupId)

      if (membersError) throw membersError

      if (!members || members.length === 0) {
        setMembersProgress([])
        return
      }

      // Get weight entries for all members
      const memberIds = members.map(m => m.user_id)
      const { data: entries, error: entriesError } = await supabase
        .from('weight_entries')
        .select('id, user_id, percentage_change, created_at')
        .in('user_id', memberIds)
        .order('created_at', { ascending: true })

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

        const days_active = userEntries.length > 0
          ? Math.ceil((new Date().getTime() - new Date(userEntries[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          user_id: member.user_id,
          display_name: member.display_name,
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
          <p className="text-sm">No progress data yet</p>
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
              <stop offset="0%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.1"/>
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Group Progress</h3>
            <p className="text-sm text-gray-500">{groupName} • {membersProgress.length} members</p>
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
            <h5 className="font-medium text-gray-900 mb-4">Progress Chart</h5>
            <MemberChart member={selectedMemberData} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Entries</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{selectedMemberData.total_entries}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Best Progress</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {selectedMemberData.best_change.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Days Active</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{selectedMemberData.days_active}</div>
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
          {membersProgress.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Progress Data</h4>
              <p className="text-gray-500">Group members haven't started tracking their progress yet</p>
            </div>
          ) : (
            <>
              {/* Leaderboard */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Progress Leaderboard
                </h4>
                <div className="space-y-2">
                  {membersProgress.slice(0, 3).map((member, index) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedMember(member.user_id)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
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
                        <span>{member.days_active} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}