import React, { useState } from 'react'
import { Ruler, Save, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface HeightEntryProps {
  onHeightAdded: () => void
  onClose?: () => void
}

export const HeightEntry: React.FC<HeightEntryProps> = ({ onHeightAdded, onClose }) => {
  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

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
    if (!user) return

    // Validate input
    if (heightUnit === 'cm' && !height) {
      setError('Please enter your height in centimeters')
      return
    }
    if (heightUnit === 'ft' && (!feet || !inches)) {
      setError('Please enter both feet and inches')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Convert height to cm for storage
      const heightInCm = heightUnit === 'cm' 
        ? convertToCm(height, 'cm')
        : convertToCm('', 'ft', feet, inches)

      // Update the user's profile with height
      const { error } = await supabase
        .from('profiles')
        .update({ height: heightInCm })
        .eq('id', user.id)

      if (error) throw error

      onHeightAdded()
    } catch (error: any) {
      console.error('Error saving height:', error)
      setError(error.message || 'Failed to save height')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-purple-500" />
          Add Your Height
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Your height helps us calculate BMI and other health metrics. This information is kept private.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  type="number"
                  step="0.1"
                  min="50"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="170.0"
                  required
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
                    required
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
                    required
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">in</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Height
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}