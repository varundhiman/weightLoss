import React, { useState, useEffect } from 'react'
import { Users, Plus, MessageSquare, Trophy, UserPlus, AlertCircle, Trash2, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Group {
  id: string
  name: string
  description: string | null
  member_count: number
  created_by: string
  invite_code: string
}

interface GroupsListProps {
  onSelectGroup: (groupId: string) => void
  selectedGroupId: string | null
}

export const GroupsList: React.FC<GroupsListProps> = ({ onSelectGroup, selectedGroupId }) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { user, signOut } = useAuth()

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    if (!user) return

    try {
      setError(null)
      
      // First get group IDs where user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (membershipError) {
        // Check if it's an authentication error (JWT expired)
        if (membershipError.message?.includes('JWT expired') || (membershipError as any).status === 401) {
          await signOut()
          return
        }
        throw new Error('Unable to fetch your groups due to database configuration issues. Please contact support.')
      }

      if (!memberships || memberships.length === 0) {
        setGroups([])
        return
      }

      // Extract group IDs into an array
      const groupIds = memberships.map(m => m.group_id)

      // Now fetch group details using the array of IDs
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, description, created_by, invite_code')
        .in('id', groupIds)

      if (groupsError) {
        // Check if it's an authentication error (JWT expired)
        if (groupsError.message?.includes('JWT expired') || (groupsError as any).status === 401) {
          await signOut()
          return
        }
        throw groupsError
      }

      const groupsWithCount = groupsData?.map(group => ({
        ...group,
        member_count: 0 // We'll skip member count for now to avoid RLS issues
      })) || []

      setGroups(groupsWithCount)
    } catch (error: any) {
      console.error('Error fetching groups:', error)
      setError(error.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      // If the deleted group was selected, clear the selection
      if (selectedGroupId === groupId) {
        onSelectGroup('')
      }

      // Refresh the groups list
      fetchGroups()
      setDeleteConfirm(null)
      setShowDropdown(null)
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  const copyInviteCode = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy invite code:', error)
    }
    setShowDropdown(null)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            My Groups
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinForm(true)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Join Group"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
              title="Create Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Groups</h4>
          <p className="text-gray-500 mb-4 text-sm">{error}</p>
          <button
            onClick={fetchGroups}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Try Again
          </button>
        </div>

        {/* Create Group Modal */}
        {showCreateForm && (
          <CreateGroupModal
            onClose={() => setShowCreateForm(false)}
            onCreated={() => {
              setShowCreateForm(false)
              fetchGroups()
            }}
          />
        )}

        {/* Join Group Modal */}
        {showJoinForm && (
          <JoinGroupModal
            onClose={() => setShowJoinForm(false)}
            onJoined={() => {
              setShowJoinForm(false)
              fetchGroups()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          My Groups
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinForm(true)}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Join Group"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
            title="Create Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h4>
          <p className="text-gray-500 mb-4">Create or join a group to start sharing your progress</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Create Group
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Join Group
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedGroupId === group.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelectGroup(group.id)}
                  className="flex-1 text-left"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === group.id ? null : group.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showDropdown === group.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                        <button
                          onClick={() => copyInviteCode(group.invite_code)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Copy Invite Code
                        </button>
                        {group.created_by === user?.id && (
                          <button
                            onClick={() => {
                              setDeleteConfirm(group.id)
                              setShowDropdown(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Group
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Group</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this group? All messages and member data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteGroup(deleteConfirm)}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateForm && (
        <CreateGroupModal
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false)
            fetchGroups()
          }}
        />
      )}

      {/* Join Group Modal */}
      {showJoinForm && (
        <JoinGroupModal
          onClose={() => setShowJoinForm(false)}
          onJoined={() => {
            setShowJoinForm(false)
            fetchGroups()
          }}
        />
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowDropdown(null)}
        />
      )}
    </div>
  )
}

// Create Group Modal Component
const CreateGroupModal: React.FC<{
  onClose: () => void
  onCreated: () => void
}> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name) return

    setLoading(true)
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          description: description || null,
          created_by: user.id,
          invite_code: inviteCode
        })
        .select()
        .single()

      if (error) throw error

      // Add creator as member
      await supabase
        .from('group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'User'
        })

      onCreated()
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="My Fitness Group"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="What's your group about?"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Join Group Modal Component
const JoinGroupModal: React.FC<{
  onClose: () => void
  onJoined: () => void
}> = ({ onClose, onJoined }) => {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !inviteCode) return

    setLoading(true)
    try {
      // Find group by invite code
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (groupError) throw new Error('Invalid invite code')

      // Add user as member
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'User'
        })

      if (error) throw error

      onJoined()
    } catch (error) {
      console.error('Error joining group:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Join Group</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="ABC123"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-character code shared by your group
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}