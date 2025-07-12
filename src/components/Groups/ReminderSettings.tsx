import React, { useState, useEffect } from 'react'
import { Bell, Clock, Mail, Users, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface ReminderLog {
  id: string
  group_id: string
  reminder_type: string
  sent_at: string
  email_sent: boolean
  group_name: string
}

interface ReminderSettingsProps {
  groupId?: string
  className?: string
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({ groupId, className = '' }) => {
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchReminderLogs()
    }
  }, [user, groupId])

  const fetchReminderLogs = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('reminder_logs')
        .select(`
          id,
          group_id,
          reminder_type,
          sent_at,
          email_sent,
          groups!inner (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(10)

      if (groupId) {
        query = query.eq('group_id', groupId)
      }

      const { data, error } = await query

      if (error) throw error

      const logsWithGroupNames = data?.map(log => ({
        id: log.id,
        group_id: log.group_id,
        reminder_type: log.reminder_type,
        sent_at: log.sent_at,
        email_sent: log.email_sent,
        group_name: (log.groups as any)?.name || 'Unknown Group'
      })) || []

      setReminderLogs(logsWithGroupNames)
    } catch (error) {
      console.error('Error fetching reminder logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerReminders = async () => {
    setTriggering(true)
    setLastResult(null)
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-weight-reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      setLastResult(result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger reminders')
      }

      // Refresh the logs after triggering
      setTimeout(() => {
        fetchReminderLogs()
      }, 2000)

    } catch (error) {
      console.error('Error triggering reminders:', error)
      setLastResult({ 
        success: false, 
        error: error.message,
        details: 'Check console for more details'
      })
    } finally {
      setTriggering(false)
    }
  }

  const sendGroupReminder = async (groupName: string) => {
    setTriggering(true)
    setLastResult(null)
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-group-specific-reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupName })
      })

      const result = await response.json()
      setLastResult(result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send group reminders')
      }

      // Refresh the logs after triggering
      setTimeout(() => {
        fetchReminderLogs()
      }, 2000)

    } catch (error) {
      console.error('Error sending group reminders:', error)
      setLastResult({ 
        success: false, 
        error: error.message,
        details: 'Check console for more details'
      })
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
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

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reminder Settings</h3>
            <p className="text-sm text-gray-500">Weight logging reminders and history</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            Debug Info
          </button>
          <button
            onClick={triggerReminders}
            disabled={triggering}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {triggering ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Reminders Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Debug Information
          </h4>
          <div className="space-y-2 text-sm text-yellow-800">
            <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}</div>
            <div><strong>User ID:</strong> {user?.id || 'Not logged in'}</div>
            <div><strong>User Email:</strong> {user?.email || 'Not available'}</div>
            <div><strong>Environment:</strong> {import.meta.env.MODE}</div>
            <div><strong>Current Status:</strong> Email sending is currently simulated (not real emails)</div>
          </div>
        </div>
      )}

      {/* Last Result */}
      {lastResult && (
        <div className={`rounded-lg p-4 mb-6 ${
          lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <h4 className={`font-medium ${lastResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {lastResult.success ? 'Success' : 'Error'}
            </h4>
          </div>
          <div className={`text-sm ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
            <p>{lastResult.message || lastResult.error}</p>
            {lastResult.result && (
              <div className="mt-2 space-y-1">
                {lastResult.result.reminders_sent !== undefined && (
                  <p>• Reminders sent: {lastResult.result.reminders_sent}</p>
                )}
                {lastResult.result.errors !== undefined && (
                  <p>• Errors: {lastResult.result.errors}</p>
                )}
                {lastResult.result.total_processed !== undefined && (
                  <p>• Total processed: {lastResult.result.total_processed}</p>
                )}
              </div>
            )}
            {lastResult.details && (
              <p className="mt-2 text-xs opacity-75">{lastResult.details}</p>
            )}
          </div>
        </div>
      )}

      {/* Test Group Reminder */}
      <div className="bg-purple-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Test Group Reminder
        </h4>
        <p className="text-sm text-purple-800 mb-3">
          Send a reminder to all members of a specific group (for testing purposes).
        </p>
        <button
          onClick={() => sendGroupReminder('New')}
          disabled={triggering}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          {triggering ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Send to "New" Group
            </>
          )}
        </button>
      </div>

      {/* Important Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Important Notice
        </h4>
        <div className="text-sm text-orange-800 space-y-2">
          <p><strong>Email Service Not Configured:</strong> The reminder system is currently in simulation mode.</p>
          <p>To receive actual emails, you need to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Configure an email service (Resend, SendGrid, etc.)</li>
            <li>Add email service API keys to environment variables</li>
            <li>Update the edge functions to use real email sending</li>
          </ul>
          <p className="mt-2"><strong>Current behavior:</strong> Reminders are logged in the database but emails are simulated.</p>
        </div>
      </div>

      {/* Reminder Rules */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          How Reminders Work
        </h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <p>Reminders are sent when you haven't logged your weight for <strong>5 or more days</strong></p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <p>You'll receive reminders with at least <strong>4 days between emails</strong></p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <p>Only active groups (within start/end dates) send reminders</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <p>Reminders are automatically sent daily at scheduled times</p>
          </div>
        </div>
      </div>

      {/* Recent Reminders */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Recent Reminders
          {!groupId && <span className="text-sm font-normal text-gray-500">(All Groups)</span>}
        </h4>
        
        {reminderLogs.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">No Reminders Yet</h5>
            <p className="text-gray-500">
              {groupId 
                ? 'No reminders have been sent for this group'
                : 'No weight logging reminders have been sent to you'
              }
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try clicking "Send Reminders Now" to test the system
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminderLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    log.email_sent ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {log.email_sent ? (
                      <Mail className="w-4 h-4 text-green-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Weight Logging Reminder
                      {!groupId && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          • {log.group_name}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  log.email_sent 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {log.email_sent ? 'Simulated' : 'Failed'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}