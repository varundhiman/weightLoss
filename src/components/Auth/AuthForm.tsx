import React, { useState } from 'react'
import { Mail, Lock, User, Scale, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface AuthFormProps {
  isSignUp: boolean
  onToggleMode: () => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ isSignUp, onToggleMode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [initialWeight, setInitialWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signUp, signIn } = useAuth()

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

  const convertToLbs = (weight: number, unit: 'lbs' | 'kg'): number => {
    return unit === 'kg' ? weight * 2.20462 : weight
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        if (!displayName || !initialWeight) {
          setError('Please fill in all fields')
          return
        }
        
        // Convert weight to lbs for storage (standardize in database)
        const weightInLbs = convertToLbs(parseFloat(initialWeight), weightUnit)
        
        const { error } = await signUp(email, password, displayName, weightInLbs)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-white" />
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
                <label htmlFor="initialWeight" className="block text-sm font-medium text-gray-700 mb-1">
                  Starting Weight
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="initialWeight"
                      type="number"
                      step="0.1"
                      min="1"
                      max={weightUnit === 'lbs' ? '1000' : '450'}
                      value={initialWeight}
                      onChange={(e) => setInitialWeight(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={weightUnit === 'lbs' ? '150.0' : '68.0'}
                      required={isSignUp}
                    />
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        weightUnit === 'lbs'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      lbs
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        weightUnit === 'kg'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      kg
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your actual weight is kept completely private - only percentage changes are shared
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