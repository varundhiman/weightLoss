import React, { useState, useEffect } from 'react'
import { Activity, Flame, TrendingDown, TrendingUp, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface BMIWidgetProps {
  userHeight?: number
  className?: string
}

interface WeightEntry {
  weight: number
  created_at: string
}

export const BMIWidget: React.FC<BMIWidgetProps> = ({ userHeight, className = '' }) => {
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [previousWeight, setPreviousWeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user && userHeight) {
      fetchLatestWeights()
    }
  }, [user, userHeight])

  const fetchLatestWeights = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('weight, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2)

      if (error) throw error

      if (data && data.length > 0) {
        setLatestWeight(data[0].weight)
        if (data.length > 1) {
          setPreviousWeight(data[1].weight)
        }
      }
    } catch (error) {
      console.error('Error fetching weight entries:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if no height or weight data
  if (!userHeight || !latestWeight || loading) {
    return null
  }

  const calculateBMI = (weightInLbs: number, heightInCm: number): number => {
    const weightInKg = weightInLbs / 2.20462
    const heightInM = heightInCm / 100
    return weightInKg / (heightInM * heightInM)
  }

  const getBMICategory = (bmi: number): { category: string; color: string; bgColor: string; borderColor: string } => {
    if (bmi < 18.5) return { 
      category: 'Underweight', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
    if (bmi < 25.0) return { 
      category: 'Normal Weight', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
    if (bmi < 30.0) return { 
      category: 'Overweight', 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
    if (bmi < 35.0) return { 
      category: 'Obese', 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
    return { 
      category: 'Severely Obese', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  }

  const calculateCalories = (weightInLbs: number, heightInCm: number, age: number = 30, gender: 'male' | 'female' = 'male'): number => {
    const weightInKg = weightInLbs / 2.20462
    
    // Using Mifflin-St Jeor Equation for BMR (Basal Metabolic Rate)
    let bmr: number
    if (gender === 'male') {
      bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + 5
    } else {
      bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) - 161
    }
    
    // Multiply by activity factor (assuming sedentary to lightly active = 1.4)
    return Math.round(bmr * 1.4)
  }

  const currentBMI = calculateBMI(latestWeight, userHeight)
  const bmiInfo = getBMICategory(currentBMI)
  const dailyCalories = calculateCalories(latestWeight, userHeight)
  
  // Calculate BMI trend if we have previous weight
  let bmiTrend: 'up' | 'down' | 'stable' | null = null
  if (previousWeight) {
    const previousBMI = calculateBMI(previousWeight, userHeight)
    const bmiDiff = currentBMI - previousBMI
    if (Math.abs(bmiDiff) < 0.1) {
      bmiTrend = 'stable'
    } else if (bmiDiff > 0) {
      bmiTrend = 'up'
    } else {
      bmiTrend = 'down'
    }
  }

  const getBMIProgressBar = (bmi: number) => {
    // BMI ranges with correct proportions
    const minBMI = 15
    const maxBMI = 40
    const totalRange = maxBMI - minBMI
    
    // Calculate position as percentage of total range
    const position = Math.min(Math.max(((bmi - minBMI) / totalRange) * 100, 0), 100)
    
    // Calculate segment widths based on actual BMI ranges
    const underweightWidth = ((18.5 - minBMI) / totalRange) * 100  // 15-18.5
    const normalWidth = ((25.0 - 18.5) / totalRange) * 100        // 18.5-25.0
    const overweightWidth = ((30.0 - 25.0) / totalRange) * 100    // 25.0-30.0
    const obeseWidth = ((35.0 - 30.0) / totalRange) * 100         // 30.0-35.0
    const severelyObeseWidth = ((maxBMI - 35.0) / totalRange) * 100 // 35.0-40.0

    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40</span>
        </div>
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          {/* BMI range segments with correct proportions */}
          <div className="absolute inset-0 flex">
            <div className="bg-blue-400" style={{ width: `${underweightWidth}%` }}></div>
            <div className="bg-green-400" style={{ width: `${normalWidth}%` }}></div>
            <div className="bg-yellow-400" style={{ width: `${overweightWidth}%` }}></div>
            <div className="bg-orange-400" style={{ width: `${obeseWidth}%` }}></div>
            <div className="bg-red-400" style={{ width: `${severelyObeseWidth}%` }}></div>
          </div>
          {/* Current BMI indicator */}
          <div 
            className="absolute top-0 w-1 h-full bg-gray-800 shadow-lg z-10"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800 rounded-full border-2 border-white"></div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Under</span>
          <span>Normal</span>
          <span>Over</span>
          <span>Obese</span>
          <span>Severe</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${bmiInfo.borderColor} ${className}`}>
      <div className={`p-6 ${bmiInfo.bgColor} rounded-t-xl`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Activity className={`w-6 h-6 ${bmiInfo.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Health Metrics</h3>
              <p className="text-sm text-gray-600">BMI & Daily Calorie Needs</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white/50 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* BMI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Current BMI</span>
              {bmiTrend && (
                <div className="flex items-center gap-1">
                  {bmiTrend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                  {bmiTrend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                  {bmiTrend === 'stable' && <div className="w-4 h-4 flex items-center justify-center text-gray-500">→</div>}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{currentBMI.toFixed(1)}</span>
              <span className={`text-sm font-medium ${bmiInfo.color}`}>{bmiInfo.category}</span>
            </div>
            {getBMIProgressBar(currentBMI)}
          </div>

          {/* Calories Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Daily Calories</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{dailyCalories.toLocaleString()}</span>
              <span className="text-sm text-gray-500">kcal</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              To maintain current weight (sedentary lifestyle)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 rounded p-2 text-center">
                <div className="font-medium text-green-700">{Math.round(dailyCalories * 0.85)}</div>
                <div className="text-green-600">Weight Loss</div>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center">
                <div className="font-medium text-blue-700">{Math.round(dailyCalories * 1.15)}</div>
                <div className="text-blue-600">Weight Gain</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Understanding Your Metrics</h4>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">BMI Categories:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li><span className="text-blue-600">• Under 18.5:</span> Underweight</li>
                <li><span className="text-green-600">• 18.5-24.9:</span> Normal weight</li>
                <li><span className="text-yellow-600">• 25.0-29.9:</span> Overweight</li>
                <li><span className="text-orange-600">• 30.0-34.9:</span> Obese</li>
                <li><span className="text-red-600">• 35.0+:</span> Severely obese</li>
              </ul>
            </div>
            <div>
              <strong className="text-gray-900">Calorie Calculation:</strong>
              <p className="text-xs mt-1">
                Based on Mifflin-St Jeor equation for a 30-year-old with sedentary to lightly active lifestyle. 
                Actual needs may vary based on age, gender, activity level, and metabolism.
              </p>
            </div>
            <div>
              <strong className="text-gray-900">Weight Goals:</strong>
              <p className="text-xs mt-1">
                <span className="text-green-600">Weight Loss:</span> 15% calorie reduction (~1-2 lbs/week)<br/>
                <span className="text-blue-600">Weight Gain:</span> 15% calorie increase (~0.5-1 lb/week)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}