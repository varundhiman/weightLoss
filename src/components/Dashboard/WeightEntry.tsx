import React, { useState } from 'react'
import { Plus, Scale, Calendar, StickyNote } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface WeightEntryProps {
  onEntryAdded: () => void
  initialWeight: number
}

export const WeightEntry: React.FC<WeightEntryProps> = ({ onEntryAdded, initialWeight }) => {
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  const convertToLbs = (weight: number, unit: 'lbs' | 'kg'): number => {
    return unit === 'kg' ? weight * 2.20462 : weight
  }

  const convertFromLbs = (weightInLbs: number, unit: 'lbs' | 'kg'): number => {
    return unit === 'kg' ? weightInLbs / 2.20462 : weightInLbs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight) return

    setLoading(true)
    try {
      // Convert current weight to lbs for calculation (since initial weight is stored in lbs)
      const currentWeightInLbs = convertToLbs(parseFloat(weight), weightUnit)
      const percentageChange = ((currentWeightInLbs - initialWeight) / initialWeight) * 100

      const { error } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: currentWeightInLbs, // Store in lbs for consistency
          percentage_change: percentageChange,
          notes: notes || null
        })

      if (error) throw error

      setWeight('')
      setNotes('')
      setIsOpen(false)
      onEntryAdded()
    } catch (error) {
      console.error('Error adding weight entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPercentageChange = () => {
    if (!weight) return null
    const currentWeightInLbs = convertToLbs(parseFloat(weight), weightUnit)
    return ((currentWeightInLbs - initialWeight) / initialWeight * 100).toFixed(1)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
      >
        <Plus className="w-5 h-5" />
        Log New Weight
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-500" />
          Log Weight Entry
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            Current Weight
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="weight"
                type="number"
                step="0.1"
                min="1"
                max={weightUnit === 'lbs' ? '1000' : '450'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={weightUnit === 'lbs' ? '150.0' : '68.0'}
                required
              />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setWeightUnit('lbs')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  weightUnit === 'lbs'
                    ? 'bg-white text-blue-600 shadow-sm'
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
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                kg
              </button>
            </div>
          </div>
          {weight && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Change: <span className={`font-medium ${parseFloat(getPercentageChange()!) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {parseFloat(getPercentageChange()!) >= 0 ? '+' : ''}{getPercentageChange()}%
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Starting weight: {convertFromLbs(initialWeight, weightUnit).toFixed(1)} {weightUnit}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <div className="relative">
            <StickyNote className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="How are you feeling? Any observations?"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !weight}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}