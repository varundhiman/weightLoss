import React from 'react'
import { X, Heart, Zap } from 'lucide-react'
import { MemeData } from '../../lib/memeUtils'

interface MemeDisplayProps {
    meme: MemeData
    onClose: () => void
    weightChange: 'loss' | 'gain' | 'first'
}

export const MemeDisplay: React.FC<MemeDisplayProps> = ({ meme, onClose, weightChange }) => {
    const getTitle = () => {
        switch (weightChange) {
            case 'loss':
                return 'Great job! You lost weight! 🎉'
            case 'gain':
                return 'Keep going! Every journey has ups and downs! 💪'
            case 'first':
                return 'Welcome to your weight tracking journey! 🌟'
            default:
                return 'Keep up the great work! 👏'
        }
    }

    const getIcon = () => {
        switch (weightChange) {
            case 'loss':
                return <Heart className="w-6 h-6 text-green-500" />
            case 'gain':
                return <Zap className="w-6 h-6 text-orange-500" />
            case 'first':
                return <Heart className="w-6 h-6 text-blue-500" />
            default:
                return <Heart className="w-6 h-6 text-purple-500" />
        }
    }

    const getBorderColor = () => {
        switch (weightChange) {
            case 'loss':
                return 'border-green-200'
            case 'gain':
                return 'border-orange-200'
            case 'first':
                return 'border-blue-200'
            default:
                return 'border-purple-200'
        }
    }

    const getBackgroundColor = () => {
        switch (weightChange) {
            case 'loss':
                return 'from-green-50 to-green-100'
            case 'gain':
                return 'from-orange-50 to-orange-100'
            case 'first':
                return 'from-blue-50 to-blue-100'
            default:
                return 'from-purple-50 to-purple-100'
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-gradient-to-br ${getBackgroundColor()} rounded-2xl shadow-2xl max-w-md w-full border-2 ${getBorderColor()}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white border-opacity-50">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-lg font-semibold text-gray-800">
                            {getTitle()}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Meme Image */}
                <div className="p-4">
                    <div className="relative rounded-xl overflow-hidden shadow-lg">
                        <img
                            src={meme.url}
                            alt="Motivational meme"
                            className="w-full h-auto max-h-80 object-contain bg-white"
                            onError={(e) => {
                                console.error('Error loading meme image:', e)
                                // Hide the image if it fails to load
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 pt-0">
                    <button
                        onClick={onClose}
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${weightChange === 'loss'
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : weightChange === 'gain'
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        Continue Tracking
                    </button>
                </div>
            </div>
        </div>
    )
}