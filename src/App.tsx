import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useMobile } from './hooks/useMobile'
import { AuthForm } from './components/Auth/AuthForm'
import { Dashboard } from './components/Dashboard/Dashboard'

function App() {
  const { user, loading } = useAuth()
  const { isNative, keyboardHeight } = useMobile()
  const [isSignUp, setIsSignUp] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ paddingBottom: isNative ? keyboardHeight : 0 }}>
        <AuthForm
          isSignUp={isSignUp}
          onToggleMode={() => setIsSignUp(!isSignUp)}
        />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: isNative ? keyboardHeight : 0 }}>
      <Dashboard />
    </div>
  )
}

export default App