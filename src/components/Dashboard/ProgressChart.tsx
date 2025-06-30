import React from 'react'
import { format } from 'date-fns'

interface WeightEntry {
  id: string
  percentage_change: number
  created_at: string
  notes?: string
}

interface ProgressChartProps {
  entries: WeightEntry[]
  className?: string
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ entries, className = '' }) => {
  if (entries.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Yet</h3>
          <p className="text-gray-500">Start logging your weight to see your progress chart</p>
        </div>
      </div>
    )
  }

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Calculate chart dimensions
  const chartWidth = 600
  const chartHeight = 300
  const padding = 40

  // Find min/max values for scaling
  const percentages = sortedEntries.map(e => e.percentage_change)
  const minPercentage = Math.min(0, Math.min(...percentages))
  const maxPercentage = Math.max(0, Math.max(...percentages))
  const range = Math.max(Math.abs(minPercentage), Math.abs(maxPercentage)) * 1.1

  // Create points for the line
  const points = sortedEntries.map((entry, index) => {
    const x = padding + (index / (sortedEntries.length - 1 || 1)) * (chartWidth - 2 * padding)
    const y = padding + (1 - (entry.percentage_change + range) / (2 * range)) * (chartHeight - 2 * padding)
    return { x, y, entry }
  })

  // Create path string for the line
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${path} ${command} ${point.x} ${point.y}`
  }, '')

  // Create gradient fill area
  const areaPath = `${pathData} L ${points[points.length - 1]?.x || 0} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`

  const currentChange = sortedEntries[sortedEntries.length - 1]?.percentage_change || 0
  const isPositive = currentChange >= 0
  const trend = sortedEntries.length > 1 
    ? sortedEntries[sortedEntries.length - 1].percentage_change - sortedEntries[sortedEntries.length - 2].percentage_change
    : 0

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Progress Chart</h3>
          <p className="text-sm text-gray-500">Percentage change from starting weight</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
            {isPositive ? '+' : ''}{currentChange.toFixed(1)}%
          </div>
          <div className={`text-sm ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-500'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}% this week
          </div>
        </div>
      </div>

      <div className="relative">
        <svg width="100%" height="300" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={isPositive ? "#FEE2E2" : "#DCFCE7"} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Zero line */}
          <line
            x1={padding}
            y1={padding + (chartHeight - 2 * padding) / 2}
            x2={chartWidth - padding}
            y2={padding + (chartHeight - 2 * padding) / 2}
            stroke="#E5E7EB"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Area fill */}
          {points.length > 0 && (
            <path
              d={areaPath}
              fill="url(#chartGradient)"
            />
          )}
          
          {/* Main line */}
          {points.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke={isPositive ? "#EF4444" : "#10B981"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="white"
                stroke={isPositive ? "#EF4444" : "#10B981"}
                strokeWidth="3"
                className="hover:r-8 cursor-pointer transition-all"
              />
              {/* Tooltip on hover would go here */}
            </g>
          ))}
        </svg>
        
        {/* Date labels */}
        <div className="flex justify-between mt-2 px-10">
          {sortedEntries.length > 0 && (
            <>
              <span className="text-xs text-gray-500">
                {format(new Date(sortedEntries[0].created_at), 'MMM d')}
              </span>
              {sortedEntries.length > 1 && (
                <span className="text-xs text-gray-500">
                  {format(new Date(sortedEntries[sortedEntries.length - 1].created_at), 'MMM d')}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Recent entries */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Entries</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {sortedEntries.slice(-3).reverse().map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {format(new Date(entry.created_at), 'MMM d, yyyy')}
              </span>
              <span className={`font-medium ${entry.percentage_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {entry.percentage_change >= 0 ? '+' : ''}{entry.percentage_change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}