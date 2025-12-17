import { useState } from 'react'
import { X } from 'lucide-react'

interface GabyTooltipProps {
  message: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function GabyTooltip({ message, children, position = 'top' }: GabyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64 bg-gradient-to-br from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <img 
                src="/gaby-default.png" 
                alt="Gaby" 
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800 font-medium leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Seta do tooltip */}
          <div
            className={`absolute ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-purple-300 border-l-transparent border-r-transparent border-b-transparent' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-purple-300 border-l-transparent border-r-transparent border-t-transparent' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-purple-300 border-t-transparent border-b-transparent border-r-transparent' :
              'right-full top-1/2 -translate-y-1/2 border-r-purple-300 border-t-transparent border-b-transparent border-l-transparent'
            } border-8`}
          />
        </div>
      )}
    </div>
  )
}

