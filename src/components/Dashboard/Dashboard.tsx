import React, { useState, useEffect } from 'react'
import { LogOut, User, Scale, Users, Trophy, Bell, BarChart3, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useMobile } from '../../hooks/useMobile'
import { supabase } from '../../lib/supabase'
import { WeightEntry } from './WeightEntry'
import { HeightEntry } from './HeightEntry'
import { BMIWidget } from './BMIWidget'
import { ProgressChart } from './ProgressChart'
import { GroupsList } from '../Groups/GroupsList'
import { GroupChat } from '../Groups/GroupChat'
import { GroupProgress } from '../Groups/GroupProgress'
import { ReminderSettings } from '../Groups/ReminderSettings'
import { NotificationBell } from '../Notifications/NotificationBell'

interface WeightEntryData {
  id: string
  percentage_change: number
  created_at: string
  notes?: string
}

interface UserProfile {
  id: string
  display_name: string
  height?: number
  initial_weight?: number
}

interface Group {
  id: string
  name: string
}

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'progress' | 'groups' | 'reminders'>('progress')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupView, setGroupView] = useState<'chat' | 'progress'>('chat')
  const [weightEntries, setWeightEntries] = useState<WeightEntryData[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHeightEntry, setShowHeightEntry] = useState(false)
  const { user, signOut } = useAuth()

  // Check if current user is admin (varundhiman@gmail.com)
  const isAdmin = user?.email === 'varundhiman@gmail.com'

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchWeightEntries()
    }
  }, [user])

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails()
    }
  }, [selectedGroupId])

  const fetchGroupDetails = async () => {
    if (!selectedGroupId) return

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', selectedGroupId)
        .single()

      if (error) throw error
      setSelectedGroup(data)
    } catch (error) {
      console.error('Error fetching group details:', error)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        
        if (error.message?.includes('JWT expired') || (error as any).status === 401) {
          await signOut()
          return
        }
        
        setUserProfile({
          id: user.id,
          display_name: user.user_metadata?.display_name || 'User',
          height: parseFloat(user.user_metadata?.height) || undefined,
          initial_weight: parseFloat(user.user_metadata?.initial_weight) || undefined
        })
        return
      }

      if (data) {
        setUserProfile(data)
      } else {
        setUserProfile({
          id: user.id,
          display_name: user.user_metadata?.display_name || 'User',
          height: parseFloat(user.user_metadata?.height) || undefined,
          initial_weight: parseFloat(user.user_metadata?.initial_weight) || undefined
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile({
        id: user.id,
        display_name: user.user_metadata?.display_name || 'User',
        height: parseFloat(user.user_metadata?.height) || undefined,
        initial_weight: parseFloat(user.user_metadata?.initial_weight) || undefined
      })
    }
  }

  const fetchWeightEntries = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('id, percentage_change, created_at, notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        if (error.message?.includes('JWT expired') || (error as any).status === 401) {
          await signOut()
          return
        }
        throw error
      }
      setWeightEntries(data || [])
    } catch (error) {
      console.error('Error fetching weight entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId)
    setGroupView('progress')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleHeightAdded = () => {
    setShowHeightEntry(false)
    fetchUserProfile()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const hasHeight = userProfile?.height && userProfile.height > 0
  const hasWeightEntries = weightEntries.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-green-500 rounded-full flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Weight Tracker</h1>
                <p className="text-sm text-gray-500">Welcome back, {userProfile?.display_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'progress'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scale className="w-4 h-4 inline mr-2" />
            My Progress
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'groups'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Groups
          </button>
          {/* Only show reminders tab for admin user */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('reminders')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'reminders'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Reminders
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {activeTab === 'progress' ? (
          <div className="space-y-6">
            {/* Height Entry Widget (if height is missing) */}
            {!hasHeight && !showHeightEntry && (
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
                      <p className="text-gray-600">Add your height to unlock BMI tracking and better health insights</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHeightEntry(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Add Height
                  </button>
                </div>
              </div>
            )}

            {/* Height Entry Form */}
            {showHeightEntry && (
              <HeightEntry
                onHeightAdded={handleHeightAdded}
                onClose={() => setShowHeightEntry(false)}
              />
            )}

            {/* BMI Widget (if height and weight entries exist) */}
            {hasHeight && hasWeightEntries && (
              <BMIWidget userHeight={userProfile?.height} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weight Entry */}
              <div className="lg:col-span-1">
                <WeightEntry
                  onEntryAdded={fetchWeightEntries}
                  userHeight={userProfile?.height}
                />
              </div>

              {/* Progress Chart */}
              <div className="lg:col-span-2">
                <ProgressChart entries={weightEntries} />
              </div>

              {/* Stats Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Scale className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Entries</p>
                      <p className="text-2xl font-bold text-gray-900">{weightEntries.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Best Change</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {weightEntries.length > 0
                          ? `${Math.min(...weightEntries.map(e => e.percentage_change)).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days Active</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {weightEntries.length > 0
                          ? Math.ceil((new Date().getTime() - new Date(weightEntries[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
                          : 0
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'reminders' && isAdmin ? (
          <div className="max-w-4xl mx-auto">
            <ReminderSettings />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Groups List */}
            <div className="lg:col-span-1">
              <GroupsList
                onSelectGroup={handleSelectGroup}
                selectedGroupId={selectedGroupId}
              />
            </div>

            {/* Group Content */}
            <div className="lg:col-span-2">
              {selectedGroupId && selectedGroup ? (
                <div className="space-y-4">
                  {/* Group View Toggle */}
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                      onClick={() => setGroupView('chat')}
                      className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                        groupView === 'chat'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Users className="w-4 h-4 inline mr-2" />
                      Chat
                    </button>
                    <button
                      onClick={() => setGroupView('progress')}
                      className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                        groupView === 'progress'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 inline mr-2" />
                      Progress
                    </button>
                  </div>

                  {/* Group Content */}
                  {groupView === 'chat' ? (
                    <GroupChat
                      groupId={selectedGroupId}
                      groupName={selectedGroup.name}
                    />
                  ) : (
                    <GroupProgress
                      groupId={selectedGroupId}
                      groupName={selectedGroup.name}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Group</h3>
                  <p className="text-gray-500">Choose a group from the sidebar to start chatting or view progress</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}