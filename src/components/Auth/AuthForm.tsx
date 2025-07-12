import React, { useState } from 'react'
import { Mail, Lock, User, Ruler, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface AuthFormProps {
  isSignUp: boolean
  onToggleMode: () => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ isSignUp, onToggleMode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const { signUp, signIn, resetPassword } = useAuth()

  const getErrorMessage = (error: any) => {
    if (error.message?.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (error.message?.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.'
    }
    if (error.message?.includes('User already registered')) {
      return 'An account with this email already exists. Try signing in instead.'
    }
    return error.message || 'An unexpected error occurred. Please try again.'
  }

  const convertToCm = (heightValue: string, unit: 'ft' | 'cm', feetValue?: string, inchesValue?: string): number => {
    if (unit === 'cm') {
      return parseFloat(heightValue)
    } else {
      // Convert feet and inches to cm
      const ft = parseFloat(feetValue || '0')
      const inch = parseFloat(inchesValue || '0')
      return (ft * 12 + inch) * 2.54
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        if (!displayName || (!height && heightUnit === 'cm') || (heightUnit === 'ft' && (!feet || !inches))) {
          setError('Please fill in all fields')
          return
        }
        
        // Convert height to cm for storage (standardize in database)
        const heightInCm = heightUnit === 'cm' 
          ? convertToCm(height, 'cm')
          : convertToCm('', 'ft', feet, inches)
        
        const { error } = await signUp(email, password, displayName, heightInCm)
        if (error) throw error
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
      }
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) return

    setResetLoading(true)
    setError('')

    try {
      const { error } = await resetPassword(resetEmail.trim())
      if (error) throw error
      
      setResetSuccess(true)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setResetLoading(false)
    }
  }

  // Forgot Password Form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {resetSuccess ? 'Check Your Email' : 'Reset Password'}
              </h1>
              <p className="text-gray-600 mt-2">
                {resetSuccess 
                  ? 'We\'ve sent you a password reset link'
                  : 'Enter your email to receive a reset link'
                }
              </p>
            </div>

            {resetSuccess ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-900">Email Sent!</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Check your inbox for a password reset link. It may take a few minutes to arrive.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  <button
                    onClick={() => {
                      setResetSuccess(false)
                      setResetEmail('')
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Try again
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetSuccess(false)
                    setResetEmail('')
                    setError('')
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setError('')
                      setResetEmail('')
                    }}
                    className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium mx-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ruler className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Join Your Journey' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSignUp 
                ? 'Start tracking your progress privately with friends'
                : 'Continue your weight loss journey'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
              {error.includes('Invalid email or password') && !isSignUp && (
                <p className="text-red-600 text-xs mt-1">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="underline hover:no-underline"
                  >
                    Sign up here
                  </button>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your display name"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Your password"
                  required
                  minLength={isSignUp ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setHeightUnit('ft')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        heightUnit === 'ft'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ft/in
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightUnit('cm')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        heightUnit === 'cm'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      cm
                    </button>
                  </div>
                  
                  {heightUnit === 'cm' ? (
                    <div className="relative flex-1">
                      <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="height"
                        type="number"
                        step="0.1"
                        min="50"
                        max="250"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="170.0"
                        required={isSignUp}
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="3"
                          max="8"
                          value={feet}
                          onChange={(e) => setFeet(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                          placeholder="5"
                          required={isSignUp}
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">ft</span>
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={inches}
                          onChange={(e) => setInches(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                          placeholder="8"
                          required={isSignUp}
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">in</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your height helps calculate BMI and other health metrics
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}