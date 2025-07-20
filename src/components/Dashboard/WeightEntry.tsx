import React, { useState } from 'react'
import { Plus, Scale, StickyNote, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getMemeForWeightChange, getPreviousWeight, MemeData } from '../../lib/memeUtils'

interface WeightEntryProps {
  onEntryAdded: () => void
  userHeight?: number
}

export const WeightEntry: React.FC<WeightEntryProps> = ({ onEntryAdded, userHeight }) => {
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showMeme, setShowMeme] = useState(false)
  const [currentMeme, setCurrentMeme] = useState<MemeData | null>(null)
  const { user } = useAuth()

  const convertToLbs = (weight: number, unit: 'lbs' | 'kg'): number => {
    return unit === 'kg' ? weight * 2.20462 : weight
  }

  const convertFromLbs = (weightInLbs: number, unit: 'lbs' | 'kg'): number => {
    return unit === 'kg' ? weightInLbs / 2.20462 : weightInLbs
  }

  const calculateBMI = (weightInKg: number, heightInCm: number): number => {
    const heightInM = heightInCm / 100
    return weightInKg / (heightInM * heightInM)
  }

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' }
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' }
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' }
    return { category: 'Obese', color: 'text-red-600' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight) return

    setLoading(true)
    try {
      // Convert current weight to lbs for calculation and storage
      const currentWeightInLbs = convertToLbs(parseFloat(weight), weightUnit)

      // Get previous weight for meme selection
      const previousWeight = await getPreviousWeight(user.id)

      // For percentage calculation, we need the initial weight
      const { data: firstEntry } = await supabase
        .from('weight_entries')
        .select('weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      let baselineWeight = firstEntry?.weight || currentWeightInLbs
      if (!firstEntry) {
        baselineWeight = currentWeightInLbs
      }

      const percentageChange = ((currentWeightInLbs - baselineWeight) / baselineWeight) * 100

      const { error } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: currentWeightInLbs,
          percentage_change: percentageChange,
          notes: notes || null
        })

      if (error) throw error

      // Show meme immediately after successful save
      const meme = await getMemeForWeightChange(currentWeightInLbs, previousWeight)
      console.log('Hi');
      console.log(meme);
      if (meme) {
        console.log()
        setCurrentMeme(meme)
        setShowMeme(true)
      }

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

  const getCurrentBMI = () => {
    if (!weight || !userHeight) return null
    const weightInKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.20462
    return calculateBMI(weightInKg, userHeight)
  }

  const currentBMI = getCurrentBMI()
  const bmiInfo = currentBMI ? getBMICategory(currentBMI) : null

  const handleOpenForm = () => {
    // Reset meme state when opening the form
    setShowMeme(false)
    setCurrentMeme(null)
    setIsOpen(true)
  }

  if (!isOpen) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleOpenForm}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Log New Weight
        </button>

        {/* Meme Card */}
        {showMeme && currentMeme && (
          <div className="bg-white rounded-xl shadow-lg p-2 border-2 border-green-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentMeme.bucket === 'weight-loss-memes' ? '🎉 Great job! You lost weight!' : '💪 Every journey has ups and downs!'}
              </h3>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-lg mb-4">
              <img
                src={currentMeme.url}
                alt="Motivational meme"
                className="w-full h-auto max-h-80 sm:max-h-64 object-contain bg-gray-50"
                onError={(e) => {
                  console.error('Error loading meme image:', e)
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <button
              onClick={() => setShowMeme(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Continue Tracking
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${weightUnit === 'lbs'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  lbs
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${weightUnit === 'kg'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  kg
                </button>
              </div>
            </div>

            {/* BMI Display */}
            {currentBMI && bmiInfo && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">BMI Information</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    BMI: <span className="font-medium">{currentBMI.toFixed(1)}</span>
                  </span>
                  <span className={`text-sm font-medium ${bmiInfo.color}`}>
                    {bmiInfo.category}
                  </span>
                </div>
              </div>
            )}

            {!userHeight && (
              <p className="text-xs text-gray-500 mt-1">
                Add your height in your profile to see BMI calculations
              </p>
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


    </>
  )
}